import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  solveGaussian,
  reduceMatrix,
  invertMatrix,
} from '@linear-steps/math-core';
import { insertRecord, reopen, summary } from './records';
import { historyRepository } from './repository';

const id = '00000000-0000-4000-8000-000000000001';
const result = solveGaussian(
  [
    ['0', '1'],
    ['1', '1'],
  ],
  ['1/3', '2'],
);
const row = {
  ...insertRecord({ operation: 'system', result }, id, 'Frações'),
  created_at: '2026-09-17T12:00:00Z',
};
describe('stored history validation', () => {
  it('reopens exact decimals at the input precision limit without rounding', () => {
    const decimal = '-12345678901234567890123456789012.123456789123';
    const result = solveGaussian([['1']], [decimal]);
    const stored = {
      ...insertRecord({ operation: 'system', result }, id, 'Decimal'),
      created_at: row.created_at,
    };
    expect(reopen(stored).b).toEqual([decimal]);
    expect(reopen(stored).result).toEqual(result);
  });
  it('round trips all current operations and classifications', () => {
    const cases = [
      { operation: 'system', result },
      { operation: 'system', result: solveGaussian([['1', '1']], ['2']) },
      { operation: 'system', result: solveGaussian([['0']], ['1']) },
      { operation: 'rref', result: reduceMatrix([['1/3', '2']]) },
      { operation: 'inverse', result: invertMatrix([['2']]) },
      { operation: 'inverse', result: invertMatrix([['0']]) },
    ] as const;
    for (const draft of cases) {
      const stored = {
        ...insertRecord(draft, id, 'Título'),
        created_at: row.created_at,
      };
      expect(reopen(JSON.parse(JSON.stringify(stored))).result).toEqual(
        draft.result,
      );
    }
    expect(reopen(row).b[0]).toBe('1/3');
  });
  it('compares independent of object key ordering and rejects altered steps', () => {
    expect(
      reopen({
        ...row,
        payload: Object.fromEntries(Object.entries(result).reverse()),
      }).result,
    ).toEqual(result);
    expect(() => reopen({ ...row, payload: { ...result, steps: [] } })).toThrow(
      'original foi preservado',
    );
  });
  it('rejects unsupported versions, malformed inputs and excessive sizes', () => {
    for (const changed of [
      { ...row, algorithm_version: 'gauss-2' },
      { ...row, schema_version: 2 },
      { ...row, payload: null },
      {
        ...row,
        payload: {
          ...result,
          input: { coefficients: Array(7).fill([]), constants: [] },
        },
      },
      { ...row, payload: { ...result, steps: 'x'.repeat(1048576) } },
      {
        ...row,
        payload: {
          ...result,
          input: {
            coefficients: [[{ numerator: '1', denominator: '0' }]],
            constants: [],
          },
        },
      },
    ])
      expect(() => reopen(changed)).toThrow();
  });
  it('bounds listing metadata and rejects unknown operations', () => {
    expect(() => summary({ ...row, title: 'x'.repeat(121) })).toThrow();
    expect(() => summary({ ...row, operation: '__proto__' })).toThrow();
    expect(() => summary({ ...row, id: 'not-an-id' })).toThrow();
    expect(() => summary({ ...row, created_at: 'not-a-date' })).toThrow();
  });
});

function setup(responses: { data?: unknown; status?: number }[]) {
  const requests: { url: string; init: RequestInit }[] = [];
  const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} });
    const response = responses.shift();
    if (!response) throw new Error('Unexpected request');
    return new Response(
      response.status === 204 ? null : JSON.stringify(response.data),
      {
        status: response.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });
  const db = createClient(
    'https://history-test.supabase.co',
    'sb_publishable_test',
    {
      accessToken: async () => 'fixed-test-identity',
      global: { fetch: fetcher },
    },
  );
  return { repository: historyRepository(async () => db), requests };
}
describe('history SDK requests', () => {
  it('saves with DO NOTHING, server defaults and explicit confirmation', async () => {
    const { repository, requests } = setup([
      { status: 201, data: null },
      { data: row },
    ]);
    const data = insertRecord({ operation: 'system', result }, id, 'Frações');
    await repository.save(data);
    expect(requests).toHaveLength(2);
    const post = requests[0]!;
    expect(new Headers(post.init.headers).get('Prefer')).toContain(
      'resolution=ignore-duplicates',
    );
    expect(new Headers(post.init.headers).get('Prefer')).toContain(
      'missing=default',
    );
    expect(new Headers(post.init.headers).get('Authorization')).toBe(
      'Bearer fixed-test-identity',
    );
    expect(new URL(post.url).searchParams.get('on_conflict')).toBe(
      'user_id,id',
    );
    expect(JSON.parse(String(post.init.body))).toEqual(data);
    expect(post.init.body).not.toContain('user_id');
    expect(post.init.body).not.toContain('created_at');
  });
  it('does not confirm a write when the confirmation read fails or differs', async () => {
    const args = insertRecord({ operation: 'system', result }, id, 'Frações');
    for (const response of [
      { status: 403, data: { message: 'denied' } },
      { data: { ...row, title: 'Outro' } },
    ]) {
      const { repository } = setup([{ status: 201, data: null }, response]);
      await expect(repository.save(args)).rejects.toThrow();
    }
  });
  it('lists summaries with filtering, stable order and one extra row for pagination', async () => {
    const { repository, requests } = setup([{ data: Array(11).fill(row) }]);
    const page = await repository.list('system', 1);
    expect(page.rows).toHaveLength(10);
    expect(page.more).toBe(true);
    const query = new URL(requests[0]!.url).searchParams;
    expect(query.get('select')).toBe('id,title,operation,created_at');
    expect(query.get('operation')).toBe('eq.system');
    expect(query.get('order')).toBe('created_at.desc,id.desc');
    expect(query.get('offset')).toBe('10');
    expect(query.get('limit')).toBe('11');
  });
  it('validates fetched records and scopes deletion to the requested id', async () => {
    const { repository, requests } = setup([{ data: row }, { status: 204 }]);
    expect((await repository.open(id)).result).toEqual(result);
    await repository.remove(id);
    expect(requests[1]!.init.method).toBe('DELETE');
    expect(new URL(requests[1]!.url).searchParams.get('id')).toBe(`eq.${id}`);
  });
});
