import { describe, expect, it } from 'vitest';
import type {
  DeterminantExpansion,
  DeterminantOptions,
  SerializedMatrix,
} from '@linear-steps/contracts';
import fixtures from '../../../tests/fixtures/reference-cases.json';
import { determinant, Rational } from './index';

const text = (m: SerializedMatrix) =>
  m.map((row) => row.map((v) => Rational.fromJSON(v).toString()));
const value = (m: string[][], options: DeterminantOptions) =>
  Rational.fromJSON(determinant(m, options).value).toString();
const triangular = { method: 'triangular' } as const;
function methods(n: number): DeterminantOptions[] {
  return [
    triangular,
    ...(n <= 2 ? [{ method: 'formula' } as const] : []),
    ...(n === 3 ? [{ method: 'sarrus' } as const] : []),
    ...(n <= 4
      ? Array.from({ length: n }, (_, index) => [
          { method: 'laplace', axis: 'row', index } as const,
          { method: 'laplace', axis: 'column', index } as const,
        ]).flat()
      : []),
  ];
}
// Independent Leibniz oracle: enumerate permutations, count inversions, use bigint.
function oracle(a: bigint[][]): bigint {
  let total = 0n;
  function visit(p: number[]) {
    if (p.length === a.length) {
      let inversions = 0;
      for (let i = 0; i < p.length; i++)
        for (let j = i + 1; j < p.length; j++) if (p[i]! > p[j]!) inversions++;
      total +=
        p.reduce((v, col, row) => v * a[row]![col]!, 1n) *
        (inversions % 2 ? -1n : 1n);
      return;
    }
    for (let col = 0; col < a.length; col++)
      if (!p.includes(col)) visit([...p, col]);
  }
  visit([]);
  return total;
}
function checkExpansion(proof: DeterminantExpansion) {
  let sum = Rational.fromIntegers(0n);
  if (proof.kind === 'laplace') {
    expect(proof.terms).toHaveLength(proof.matrix.length);
    for (const term of proof.terms) {
      expect(proof.axis === 'row' ? term.row : term.column).toBe(proof.index);
      expect(term.coefficient).toEqual(proof.matrix[term.row]![term.column]);
      expect(term.sign).toBe((term.row + term.column) % 2 ? -1 : 1);
      expect(term.minor.matrix).toEqual(
        proof.matrix
          .filter((_, i) => i !== term.row)
          .map((row) => row.filter((_, j) => j !== term.column)),
      );
      checkExpansion(term.minor);
      const contribution = Rational.fromJSON(term.coefficient)
        .multiply(Rational.fromJSON(term.minor.value))
        .multiply(Rational.fromIntegers(BigInt(term.sign)));
      expect(term.contribution).toEqual(contribution.toJSON());
      sum = sum.add(contribution);
    }
  } else {
    for (const term of proof.terms) {
      const product = term.cells.reduce(
        (p, cell) =>
          p.multiply(Rational.fromJSON(proof.matrix[cell.row]![cell.column]!)),
        Rational.fromIntegers(1n),
      );
      expect(term.product).toEqual(product.toJSON());
      sum = sum.add(product.multiply(Rational.fromIntegers(BigInt(term.sign))));
    }
  }
  expect(proof.value).toEqual(sum.toJSON());
}
function checkFrozen(v: unknown) {
  if (v && typeof v === 'object') {
    expect(Object.isFrozen(v)).toBe(true);
    Object.values(v).forEach(checkFrozen);
  }
}

describe('determinants', () => {
  it.each(fixtures.cases.filter((c) => c.operation === 'determinant'))(
    'solves $id with every available method',
    (c) => {
      const matrix = c.input.matrix!;
      for (const method of methods(matrix.length))
        expect(value(matrix, method)).toBe(
          (c.expected as { value: string }).value,
        );
    },
  );
  it.each([1, 2, 3, 4, 5, 6])(
    'agrees with a permutation oracle for order %i',
    (n) => {
      for (let seed = 1; seed <= 5; seed++) {
        const a = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) =>
            BigInt(
              (((i + 3) * (j + seed + 1) + i * i + seed * j * j) % 11) - 5,
            ),
          ),
        );
        for (const method of methods(n))
          expect(
            value(
              a.map((row) => row.map(String)),
              method,
            ),
          ).toBe(String(oracle(a)));
      }
    },
  );
  it('preserves exact fractions, decimal input and large integers', () => {
    for (const method of methods(2))
      expect(
        value(
          [
            ['1/2', '0.25'],
            ['-2', '1/3'],
          ],
          method,
        ),
      ).toBe('2/3');
    expect(value([['9007199254740993']], triangular)).toBe('9007199254740993');
    expect(value([['-7/3']], { method: 'formula' })).toBe('-7/3');
  });
  it('records recursive minors and every selected row or column', () => {
    const a = [
      ['2', '-1', '0', '3'],
      ['1', '4', '2', '-2'],
      ['0', '3', '-1', '5'],
      ['2', '0', '1', '1'],
    ];
    for (const method of methods(4)) {
      const result = determinant(a, method);
      expect(result.options).toEqual(method);
      if (result.proof.kind !== 'triangular') checkExpansion(result.proof);
    }
    checkExpansion(
      determinant(
        a.slice(0, 3).map((row) => row.slice(0, 3)),
        { method: 'sarrus' },
      ).proof as DeterminantExpansion,
    );
  });
  it.each([
    [
      ['0', '1'],
      ['2', '3'],
    ],
    [
      ['0', '1', '0'],
      ['0', '0', '1'],
      ['1', '0', '0'],
    ],
    [
      ['0', '2', '3'],
      ['0', '0', '1'],
      ['0', '4', '2'],
    ],
    [
      ['1', '2', '3'],
      ['2', '4', '6'],
      ['3', '6', '9'],
    ],
    [
      ['0', '0'],
      ['0', '0'],
    ],
  ])('replays row operations and determinant corrections for %j', (...rows) => {
    const input = rows as string[][];
    const result = determinant(input, triangular);
    const proof = result.proof;
    if (proof.kind !== 'triangular') throw Error('proof');
    const matrix = input.map((row) =>
      row.map((v) => Rational.fromIntegers(BigInt(v))),
    );
    let correction = 1;
    for (const step of proof.steps) {
      if (step.kind === 'swap') {
        [matrix[step.first], matrix[step.second]] = [
          matrix[step.second]!,
          matrix[step.first]!,
        ];
        correction *= -1;
      } else if (step.kind === 'add-row') {
        matrix[step.target] = matrix[step.target]!.map((v, j) =>
          v.add(
            Rational.fromJSON(step.factor).multiply(matrix[step.source]![j]!),
          ),
        );
      }
      expect(text(step.matrix)).toEqual(
        matrix.map((row) => row.map((v) => v.toString())),
      );
      expect(step.correction).toBe(correction);
    }
    for (let i = 0; i < matrix.length; i++)
      for (let j = 0; j < i; j++) expect(matrix[i]![j]!.isZero()).toBe(true);
    expect(proof.triangular).toEqual(proof.steps.at(-1)!.matrix);
    const product = matrix.reduce(
      (p, row, i) => p.multiply(row[i]!),
      Rational.fromIntegers(1n),
    );
    expect(proof.diagonalProduct).toEqual(product.toJSON());
    expect(result.value).toEqual(
      product.multiply(Rational.fromIntegers(BigInt(correction))).toJSON(),
    );
    expect(Rational.fromJSON(result.value).toString()).toBe(
      String(oracle(input.map((row) => row.map(BigInt)))),
    );
  });
  it('obeys transpose, swap, scaling and row-addition identities', () => {
    const a = [
      ['2', '3', '1'],
      ['4', '-1', '2'],
      ['0', '5', '3'],
    ];
    const d = Rational.fromJSON(determinant(a, triangular).value);
    expect(
      value(
        a[0]!.map((_, j) => a.map((row) => row[j]!)),
        triangular,
      ),
    ).toBe(d.toString());
    expect(value([a[1]!, a[0]!, a[2]!], triangular)).toBe(
      d.negate().toString(),
    );
    expect(
      value(
        [a[0]!.map((v) => String(BigInt(v) * 3n)), a[1]!, a[2]!],
        triangular,
      ),
    ).toBe(d.multiply(Rational.fromIntegers(3n)).toString());
    expect(
      value(
        [
          a[0]!,
          a[1]!.map((v, j) => String(BigInt(v) + 2n * BigInt(a[0]![j]!))),
          a[2]!,
        ],
        triangular,
      ),
    ).toBe(d.toString());
  });
  it('rejects incompatible methods and invalid expansion coordinates', () => {
    const square = (n: number) =>
      Array.from({ length: n }, () => Array.from({ length: n }, () => '1'));
    for (const [n, options] of [
      [3, { method: 'formula' }],
      [2, { method: 'sarrus' }],
      [4, { method: 'sarrus' }],
      [5, { method: 'laplace', axis: 'row', index: 0 }],
      [2, { method: 'laplace', axis: 'row', index: -1 }],
      [2, { method: 'laplace', axis: 'column', index: 2 }],
      [2, { method: 'laplace', axis: 'row', index: 0.5 }],
      [2, { method: 'laplace', axis: 'bad', index: 0 }],
      [2, { method: 'bad' }],
      [2, null],
    ] as const) {
      expect(() =>
        determinant(square(n), options as DeterminantOptions),
      ).toThrow();
    }
    expect(() => determinant([['1', '2']], triangular)).toThrow();
    expect(() => determinant(square(7), triangular)).toThrow();
  });
  it('returns immutable JSON-safe snapshots without mutating inputs or options', () => {
    const input = [
      ['1', '2'],
      ['3', '4'],
    ];
    const options = { method: 'laplace', axis: 'column', index: 1 } as const;
    const result = determinant(input, options);
    checkFrozen(result);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    input[0]![0] = '99';
    expect(text(result.input)[0]![0]).toBe('1');
    expect(Object.isFrozen(options)).toBe(false);
    checkFrozen(determinant(input, triangular));
  });
});
