import { describe, expect, it } from 'vitest';
import type {
  ReductionResult,
  SerializedMatrix,
} from '@linear-steps/contracts';
import fixtures from '../../../tests/fixtures/reference-cases.json';
import { invertMatrix, reduceMatrix } from './reduction';
import { parseMatrix } from './input';
import { Rational } from './rational';

const text = (matrix: SerializedMatrix) =>
  matrix.map((row) => row.map((value) => Rational.fromJSON(value).toString()));
const identity = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? '1' : '0')),
  );
function product(a: string[][], b: string[][]) {
  const left = parseMatrix(a),
    right = parseMatrix(b);
  return left.map((row) =>
    right[0]!.map((_, j) =>
      row
        .reduce(
          (sum, value, k) => sum.add(value.multiply(right[k]![j]!)),
          Rational.fromIntegers(0n),
        )
        .toString(),
    ),
  );
}
function replay(result: ReductionResult) {
  const matrix = result.steps[0]!.matrix.map((row) =>
    row.map(Rational.fromJSON),
  );
  for (const step of result.steps.slice(1)) {
    if (step.kind === 'swap') {
      const [a, b] = step.rows;
      [matrix[a], matrix[b]] = [matrix[b]!, matrix[a]!];
    } else if (step.kind === 'scale-row') {
      matrix[step.row] = matrix[step.row]!.map((value) =>
        value.multiply(Rational.fromJSON(step.factor)),
      );
    } else if (step.kind === 'add-row') {
      matrix[step.target] = matrix[step.target]!.map((value, j) =>
        value.add(
          Rational.fromJSON(step.factor).multiply(matrix[step.source]![j]!),
        ),
      );
    }
    expect(matrix.map((row) => row.map((value) => value.toString()))).toEqual(
      text(step.matrix),
    );
  }
  expect(matrix.map((row) => row.map((value) => value.toString()))).toEqual(
    text(result.reduced),
  );
}
function frozen(value: unknown) {
  if (value && typeof value === 'object') {
    expect(Object.isFrozen(value)).toBe(true);
    Object.values(value).forEach(frozen);
  }
}

describe('Gauss-Jordan reduction', () => {
  it('matches MAT-01 including its last-column pivot', () => {
    const reference = fixtures.cases.find((value) => value.id === 'MAT-01')!;
    const result = reduceMatrix(reference.input.matrix);
    expect(text(result.reduced)).toEqual(reference.expected.matrix);
    expect(result.rank).toBe(3);
    expect(result.pivots.map((pivot) => pivot.column)).toEqual([0, 2, 3]);
    replay(result);
  });
  it.each(
    [
      [
        ['0', '2'],
        ['3', '4'],
      ],
      [
        ['0', '1', '2'],
        ['0', '2', '4'],
        ['0', '0', '0'],
      ],
      [['0', '0']],
      [['0'], ['2'], ['4']],
      [
        ['1/3', '0.5'],
        ['-2', '0,25'],
      ],
      identity(6),
    ].map((input) => ({ input })),
  )(
    'has normalized pivots, zero pivot columns and is idempotent %#',
    ({ input }) => {
      const result = reduceMatrix(input);
      const reduced = text(result.reduced);
      result.pivots.forEach(({ row, column }) =>
        reduced.forEach((values, i) =>
          expect(values[column]).toBe(i === row ? '1' : '0'),
        ),
      );
      expect(text(reduceMatrix(reduced).reduced)).toEqual(reduced);
      replay(result);
      frozen(result);
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    },
  );
  it('does not mutate the supplied matrix', () => {
    const input = [
      ['2', '1'],
      ['4', '3'],
    ];
    const before = JSON.stringify(input);
    reduceMatrix(input);
    invertMatrix(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('inverse', () => {
  it.each(
    [
      fixtures.cases.find((value) => value.id === 'MAT-04')!.input.matrix!,
      [
        ['0', '1'],
        ['2', '3'],
      ],
      [['-2/3']],
      [
        ['1/3', '0.5'],
        ['-2', '0,25'],
      ],
      identity(6),
    ].map((input) => ({ input })),
  )(
    'satisfies both inverse identities and replays augmented steps %#',
    ({ input }) => {
      const result = invertMatrix(input);
      expect(result.classification).toBe('invertible');
      if (result.classification !== 'invertible')
        throw new Error('Expected inverse');
      const inverse = text(result.inverse);
      expect(product(input, inverse)).toEqual(identity(input.length));
      expect(product(inverse, input)).toEqual(identity(input.length));
      expect(
        text(result.reduced).map((row) => row.slice(0, input.length)),
      ).toEqual(identity(input.length));
      replay(result);
      frozen(result);
    },
  );
  it('matches the MAT-04 reference inverse', () => {
    const reference = fixtures.cases.find((value) => value.id === 'MAT-04')!;
    const result = invertMatrix(reference.input.matrix);
    if (result.classification !== 'invertible')
      throw new Error('Expected inverse');
    expect(text(result.inverse)).toEqual(reference.expected.matrix);
  });
  it.each(
    [
      [
        ['1', '2'],
        ['2', '4'],
      ],
      [['0']],
      [
        ['0', '1'],
        ['0', '2'],
      ],
    ].map((input) => ({ input })),
  )(
    'returns singular without inventing pivots in the identity block %#',
    ({ input }) => {
      const result = invertMatrix(input);
      expect(result.classification).toBe('singular');
      expect(result.rank).toBeLessThan(input.length);
      expect(result).not.toHaveProperty('inverse');
      replay(result);
    },
  );
  it.each(
    [
      [],
      [['1', '2']],
      [['1'], ['2']],
      [['1', '2'], ['3']],
      [['1/0']],
      Array.from({ length: 7 }, () => ['1']),
    ].map((input) => ({ input })),
  )('rejects invalid inverse input %#', ({ input }) => {
    expect(() => invertMatrix(input)).toThrow();
  });
});
