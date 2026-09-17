import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  invertMatrix,
  reduceMatrix,
  solveGaussian,
} from '../packages/math-core/src/index';

// Real PostgreSQL engine, with only the Supabase identity boundary substituted.
// Hosted Auth/JWT verification and PostgREST still require integration testing.
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
const id = '00000000-0000-4000-8000-000000000010';
const otherId = '00000000-0000-4000-8000-000000000011';
const solution = solveGaussian(
  [
    ['0', '1'],
    ['1', '1'],
  ],
  ['1/3', '2'],
);
let db: PGlite;
const insertSql = `insert into public.calculations
  (id, operation, method, title, schema_version, algorithm_version, payload)
  values ($1, $2, $3, $4, $5, $6, $7)`;
function values(
  payload: unknown = solution,
  operation = 'system',
  method = 'gauss',
  version = 'gauss-1',
  recordId = id,
) {
  return [
    recordId,
    operation,
    method,
    'Meu cálculo',
    1,
    version,
    JSON.stringify(payload),
  ];
}
async function identity(userId: string | null, role = 'authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId ?? '',
  ]);
  await db.exec(`set role ${role}`);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    -- Emulate legacy broad defaults to ensure the migration removes them.
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  await db.query('insert into auth.users values ($1), ($2)', [alice, bob]);
  await db.exec(
    await readFile(
      new URL(
        '../supabase/migrations/20260917000100_calculation_history.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
}, 60000);
beforeEach(async () => {
  await db.exec('reset role; truncate public.calculations');
  await identity(alice);
});
afterAll(async () => {
  await db?.close();
});

describe('calculation history SQL permissions and storage', () => {
  it('stores exact fractions, steps, owner and server timestamp', async () => {
    const saved = await db.query<{
      payload: typeof solution;
      user_id: string;
      created_at: Date;
    }>(`${insertSql} returning payload, user_id, created_at`, values());
    expect(saved.rows[0]!.payload).toEqual(solution);
    expect(saved.rows[0]!.user_id).toBe(alice);
    expect(new Date(saved.rows[0]!.created_at).getTime()).toBeGreaterThan(
      Date.now() - 60000,
    );
  });

  it('denies anonymous read, insert and delete even with legacy defaults', async () => {
    await identity(null, 'anon');
    for (const sql of [
      'select * from public.calculations',
      'delete from public.calculations',
    ])
      await expect(db.query(sql)).rejects.toMatchObject({ code: '42501' });
    await expect(db.query(insertSql, values())).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('isolates reads and deletes between two owners', async () => {
    await db.query(insertSql, values());
    await identity(bob);
    expect(
      (await db.query('select * from public.calculations where id = $1', [id]))
        .rows,
    ).toEqual([]);
    expect(
      (
        await db.query(
          'delete from public.calculations where id = $1 returning id',
          [id],
        )
      ).rows,
    ).toEqual([]);
    await identity(alice);
    expect(
      (await db.query('select id from public.calculations')).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          'delete from public.calculations where id = $1 returning id',
          [id],
        )
      ).rows,
    ).toHaveLength(1);
  });

  it('rejects forged owner and timestamp columns', async () => {
    for (const extra of [
      ", user_id) values ($1, $2, $3, $4, $5, $6, $7, '" + bob + "')",
      ", created_at) values ($1, $2, $3, $4, $5, $6, $7, '2000-01-01')",
    ]) {
      const sql = insertSql.slice(0, insertSql.indexOf(')')) + extra;
      await expect(db.query(sql, values())).rejects.toMatchObject({
        code: '42501',
      });
    }
  });

  it('has an effective insert RLS policy independently of column grants', async () => {
    await db.exec(
      'reset role; grant insert (user_id) on public.calculations to authenticated',
    );
    try {
      await identity(alice);
      const sql = insertSql
        .replace('payload)', 'payload, user_id)')
        .replace('$7)', '$7, $8)');
      await expect(db.query(sql, [...values(), bob])).rejects.toMatchObject({
        code: '42501',
      });
    } finally {
      await db.exec(
        'reset role; revoke insert (user_id) on public.calculations from authenticated',
      );
    }
  });

  it('denies updates to snapshots, titles and ownership', async () => {
    await db.query(insertSql, values());
    for (const assignment of [
      "title = 'Alterado'",
      "payload = '{}'",
      `user_id = '${bob}'`,
    ])
      await expect(
        db.query(`update public.calculations set ${assignment} where id = $1`, [
          id,
        ]),
      ).rejects.toMatchObject({ code: '42501' });
  });

  it('retries an immutable save without duplicates or overwrites', async () => {
    const sql = `${insertSql} on conflict (user_id, id) do nothing`;
    await db.query(sql, values());
    const changed = values(solveGaussian([['1']], ['9']));
    await db.query(sql, changed);
    const rows = (
      await db.query<{ payload: typeof solution }>(
        'select payload from public.calculations where id = $1',
        [id],
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.payload).toEqual(solution);
  });

  it('allows the same request id for different owners without cross-account conflicts', async () => {
    const sql = `${insertSql} on conflict (user_id, id) do nothing`;
    await db.query(sql, values());
    await identity(bob);
    await db.query(sql, values());
    const rows = (
      await db.query<{ user_id: string }>(
        'select user_id from public.calculations',
      )
    ).rows;
    expect(rows).toEqual([{ user_id: bob }]);
    await db.exec('reset role');
    expect(
      (await db.query('select id from public.calculations')).rows,
    ).toHaveLength(2);
  });

  it('rejects a missing identity and a deleted or nonexistent user', async () => {
    await identity(null);
    await expect(db.query(insertSql, values())).rejects.toBeDefined();
    await identity(otherId);
    await expect(db.query(insertSql, values())).rejects.toMatchObject({
      code: '23503',
    });
  });

  it('accepts reduced matrices and both inverse classifications', async () => {
    for (const [operation, payload] of [
      ['rref', reduceMatrix([['1', '2', '3']])],
      ['inverse', invertMatrix([['2']])],
      ['inverse', invertMatrix([['0']])],
    ] as const) {
      await db.query('delete from public.calculations');
      await db.query(
        insertSql,
        values(payload, operation, 'gauss-jordan', 'gauss-jordan-1'),
      );
      expect(
        (await db.query('select payload from public.calculations')).rows,
      ).toEqual([{ payload }]);
    }
  });

  it('rejects unsupported or mismatched operation, method and versions', async () => {
    for (const args of [
      values(solution, 'unknown'),
      values(solution, 'rref'),
      values(solution, 'system', 'gauss', 'gauss-2'),
      values({ ...solution, schemaVersion: '1' }),
      values({ ...solution, algorithmVersion: 'gauss-2' }),
    ])
      await expect(db.query(insertSql, args)).rejects.toMatchObject({
        code: '23514',
      });
  });

  it('rejects null, missing, malformed and oversized envelopes', async () => {
    for (const payload of [
      null,
      [],
      {},
      { ...solution, steps: null },
      { ...solution, input: {} },
      { ...solution, extra: 'x'.repeat(1048576) },
    ])
      await expect(db.query(insertSql, values(payload))).rejects.toMatchObject({
        code: '23514',
      });
    const inverse = invertMatrix([['1']]);
    await expect(
      db.query(
        insertSql,
        values(
          { ...inverse, inverse: null },
          'inverse',
          'gauss-jordan',
          'gauss-jordan-1',
        ),
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('bounds titles and supports stable ordering and operation filters', async () => {
    for (const title of ['   ', 'x'.repeat(121)]) {
      const args = values();
      args[3] = title;
      await expect(db.query(insertSql, args)).rejects.toMatchObject({
        code: '23514',
      });
    }
    await db.query(insertSql, values());
    await db.query(
      insertSql,
      values(
        reduceMatrix([['1']]),
        'rref',
        'gauss-jordan',
        'gauss-jordan-1',
        otherId,
      ),
    );
    await db.exec(
      "reset role; update public.calculations set created_at = '2026-01-01'",
    );
    await identity(alice);
    expect(
      (
        await db.query(
          'select id from public.calculations order by created_at desc, id desc',
        )
      ).rows,
    ).toEqual([{ id: otherId }, { id }]);
    expect(
      (
        await db.query(
          "select id from public.calculations where operation = 'system'",
        )
      ).rows,
    ).toEqual([{ id }]);
  });

  it('removes snapshots when the owner is deleted', async () => {
    await db.query(insertSql, values());
    await db.exec('reset role');
    await db.query('delete from auth.users where id = $1', [alice]);
    expect((await db.query('select * from public.calculations')).rows).toEqual(
      [],
    );
    await db.query('insert into auth.users values ($1)', [alice]);
  });
});
