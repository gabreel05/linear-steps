import { expect, it } from 'vitest';
import type {
  SerializedMatrix,
  SerializedVector,
} from '@linear-steps/contracts';
import { analyzeSpan, solveLinearCombination } from './span';
import { Rational } from './rational';
import { parseScalar } from './input';

const strings = (v: SerializedVector) =>
  v.map((x) => Rational.fromJSON(x).toString());
function combine(vectors: SerializedMatrix, coefficients: SerializedVector) {
  return vectors[0]!.map((_, row) =>
    vectors
      .reduce(
        (sum, v, i) =>
          sum.add(
            Rational.fromJSON(v[row]!).multiply(
              Rational.fromJSON(coefficients[i]!),
            ),
          ),
        Rational.fromIntegers(0n),
      )
      .toString(),
  );
}

it('selects original pivot vectors after row swaps and skipped columns', () => {
  const input = [
    ['0', '1', '0'],
    ['0', '2', '0'],
    ['1', '0', '0'],
  ];
  const result = analyzeSpan(input);
  expect(result.basisIndices).toEqual([0, 2]);
  expect(result.basis.map(strings)).toEqual([input[0], input[2]]);
  expect(result.dimension).toBe(2);
  expect(result.spansAmbientSpace).toBe(false);
  expect(result.isBasisOfAmbientSpace).toBe(false);
  expect(result.system.steps.some((s) => s.kind === 'swap')).toBe(true);
  expect(result.independent).toBe(false);
  if (!result.independent) {
    expect(combine(result.vectors, result.dependenceRelation)).toEqual([
      '0',
      '0',
      '0',
    ]);
    expect(strings(result.dependenceRelation).some((x) => x !== '0')).toBe(
      true,
    );
  }
});

it('returns an empty basis for zero span and a nontrivial dependence witness', () => {
  const result = analyzeSpan([
    ['0', '0'],
    ['0', '0'],
  ]);
  expect(result.basis).toEqual([]);
  expect(result.dimension).toBe(0);
  expect(result.independent).toBe(false);
  if (!result.independent)
    expect(strings(result.dependenceRelation)).toEqual(['1', '0']);
});

it('distinguishes independence, spanning and ambient basis', () => {
  expect(
    analyzeSpan([
      ['1', '0', '0'],
      ['0', '1', '0'],
    ]),
  ).toMatchObject({
    independent: true,
    spansAmbientSpace: false,
    isBasisOfAmbientSpace: false,
  });
  expect(
    analyzeSpan([
      ['1', '0'],
      ['0', '1'],
      ['1', '1'],
    ]),
  ).toMatchObject({
    independent: false,
    spansAmbientSpace: true,
    isBasisOfAmbientSpace: false,
  });
  expect(
    analyzeSpan([
      ['1', '0'],
      ['0', '1'],
    ]),
  ).toMatchObject({
    independent: true,
    spansAmbientSpace: true,
    isBasisOfAmbientSpace: true,
  });
});

it.each([1, 2, 3, 4, 5, 6])(
  'recognizes a basis in dimension %i and reconstructs exact coordinates',
  (n) => {
    const vectors = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? '2' : '0')),
    );
    expect(analyzeSpan(vectors).isBasisOfAmbientSpace).toBe(true);
    const result = solveLinearCombination(vectors, Array(n).fill('1/3'));
    expect(result.system.classification).toBe('unique');
    if (result.system.classification === 'unique') {
      expect(strings(result.system.solution)).toEqual(Array(n).fill('1/6'));
      expect(combine(result.vectors, result.system.solution)).toEqual(
        strings(result.target),
      );
    }
  },
);

it('preserves every free coefficient direction for a redundant spanning set', () => {
  const result = solveLinearCombination(
    [
      ['1', '2'],
      ['2', '4'],
      ['0', '0'],
    ],
    ['3', '6'],
  );
  expect(result.belongsToSpan).toBe(true);
  expect(result.system.classification).toBe('infinite');
  if (result.system.classification === 'infinite') {
    expect(result.system.directions).toHaveLength(2);
    expect(combine(result.vectors, result.system.particular)).toEqual([
      '3',
      '6',
    ]);
    for (const direction of result.system.directions)
      expect(combine(result.vectors, direction)).toEqual(['0', '0']);
  }
});

it('provides a contradiction for a target outside the span', () => {
  const result = solveLinearCombination(
    [
      ['1', '2'],
      ['2', '4'],
    ],
    ['1', '0'],
  );
  expect(result.belongsToSpan).toBe(false);
  expect(result.system.classification).toBe('inconsistent');
  if (result.system.classification === 'inconsistent') {
    const row = strings(result.system.echelon[result.system.contradictionRow]!);
    expect(row.slice(0, -1)).toEqual(['0', '0']);
    expect(row.at(-1)).not.toBe('0');
  }
});

it('handles zero targets and zero generators without losing free parameters', () => {
  expect(solveLinearCombination([['0']], ['0']).system.classification).toBe(
    'infinite',
  );
  expect(solveLinearCombination([['0']], ['1']).belongsToSpan).toBe(false);
  expect(solveLinearCombination([['2']], ['0']).system.classification).toBe(
    'unique',
  );
});

it('does not reparse canonical fractions exceeding the input integer limit', () => {
  const x = '12345678901234567890123456789012.123456789012';
  const result = solveLinearCombination([[x]], [x]);
  expect(result.system.classification).toBe('unique');
  if (result.system.classification === 'unique')
    expect(strings(result.system.solution)).toEqual(['1']);
  expect(result.vectors[0]![0]).toEqual(parseScalar(x).toJSON());
});

it.each([
  [],
  [['1'], ['1', '2']],
  [[1]],
  [['a']],
  Array(7).fill(['1']),
  [Array(7).fill('1')],
  Array(2),
])('rejects invalid generators %j', (input) => {
  expect(() => analyzeSpan(input)).toThrow();
});

it('validates target dimensions and scalars', () => {
  expect(() => solveLinearCombination([['1', '2']], ['1'])).toThrow();
  expect(() => solveLinearCombination([['1']], ['√2'])).toThrow();
});

it('does not mutate input and produces deeply frozen JSON-safe results', () => {
  const input = Object.freeze([
    Object.freeze(['1', '2']),
    Object.freeze(['2', '4']),
  ]);
  const result = analyzeSpan(input);
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  const frozen = (value: unknown): void => {
    if (typeof value === 'object' && value !== null) {
      expect(Object.isFrozen(value)).toBe(true);
      Object.values(value).forEach(frozen);
    }
  };
  frozen(result);
  frozen(solveLinearCombination(input, ['3', '6']));
  expect(input).toEqual([
    ['1', '2'],
    ['2', '4'],
  ]);
});
