import { expect, it } from 'vitest';
import fixtures from '../../../tests/fixtures/reference-cases.json';
import { invertByAdjugate, invertMatrix, parseMatrix, Rational } from './index';
import type { SerializedMatrix } from '@linear-steps/contracts';

function verify(a: string[][]) {
  const result = invertByAdjugate(a);
  const original = parseMatrix(a);
  const checkProduct = (
    left: SerializedMatrix,
    right: SerializedMatrix,
    diagonal: Rational,
  ) => {
    left.forEach((row, i) =>
      right.forEach((_, j) => {
        const sum = row.reduce(
          (s, v, k) =>
            s.add(
              Rational.fromJSON(v).multiply(Rational.fromJSON(right[k]![j]!)),
            ),
          Rational.fromIntegers(0n),
        );
        expect(sum.toJSON()).toEqual(
          (i === j ? diagonal : Rational.fromIntegers(0n)).toJSON(),
        );
      }),
    );
  };
  const d = Rational.fromJSON(result.determinant.value);
  checkProduct(result.input, result.adjugate, d);
  checkProduct(result.adjugate, result.input, d);
  for (const step of result.steps) {
    expect(step.minor).toEqual(
      original
        .filter((_, i) => i !== step.row)
        .map((r) =>
          r.filter((_, j) => j !== step.column).map((v) => v.toJSON()),
        ),
    );
    expect(step.sign).toBe((step.row + step.column) % 2 === 0 ? 1 : -1);
    expect(step.value).toEqual(
      Rational.fromJSON(step.determinant.value)
        .multiply(Rational.fromIntegers(BigInt(step.sign)))
        .toJSON(),
    );
    expect(result.adjugate[step.column]![step.row]).toEqual(step.value);
  }
  const gaussian = invertMatrix(a);
  expect(result.classification).toBe(gaussian.classification);
  if (
    result.classification === 'invertible' &&
    gaussian.classification === 'invertible'
  ) {
    expect(result.inverse).toEqual(gaussian.inverse);
    checkProduct(result.input, result.inverse, Rational.fromIntegers(1n));
    checkProduct(result.inverse, result.input, Rational.fromIntegers(1n));
  } else {
    expect(result).not.toHaveProperty('inverse');
    expect(result).not.toHaveProperty('factor');
  }
  function frozen(v: unknown) {
    if (v && typeof v === 'object') {
      expect(Object.isFrozen(v)).toBe(true);
      Object.values(v).forEach(frozen);
    }
  }
  frozen(result);
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  return result;
}

it.each([1, 2, 3, 4])(
  'verifies both identities and Gauss-Jordan agreement at order %i',
  (n) => {
    verify(
      Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) =>
          String(i === j ? 3 : i < j ? 2 : 0),
        ),
      ),
    );
  },
);
it('handles swaps, signs, fractions and negative determinants', () => {
  verify([
    ['0', '1/2'],
    ['-3', '2'],
  ]);
  verify([
    ['1', '2'],
    ['3', '4'],
  ]);
});
it.each(
  [
    [['0']],
    [
      ['1', '2'],
      ['2', '4'],
    ],
    [
      ['1', '0', '0'],
      ['0', '0', '0'],
      ['0', '0', '1'],
    ],
  ].map((a) => ({ a })),
)('retains adjugate proof for singular matrices %#', ({ a }) => {
  verify(a);
});
it('uses the empty determinant convention in order one', () => {
  const r = verify([['-2/3']]);
  expect(r.steps[0]!.determinant).toEqual({
    kind: 'empty',
    value: { numerator: '1', denominator: '1' },
  });
  expect(r.adjugate).toEqual([[{ numerator: '1', denominator: '1' }]]);
});
it('preserves input and accepts long decimal spelling', () => {
  const a = [
    ['12345678901234567890123456789012.123456789012', '0'],
    ['0', '1'],
  ];
  const before = JSON.stringify(a);
  verify(a);
  expect(JSON.stringify(a)).toBe(before);
});
it('checks reference matrices against known inverses or Gauss-Jordan', () => {
  for (const c of fixtures.cases.filter(
    (c) => c.id === 'MAT-04' || c.operation === 'solve',
  )) {
    verify(c.input.matrix!);
  }
});
it('rejects unsupported and malformed inputs', () => {
  for (const a of [
    [],
    [['1', '2']],
    [['1/0']],
    [['a']],
    Array.from({ length: 5 }, () => Array<string>(5).fill('1')),
  ])
    expect(() => invertByAdjugate(a)).toThrow();
});
