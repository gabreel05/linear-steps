import { expect, it } from 'vitest';
import type {
  ExactReal,
  SerializedVector,
  CrossGeometryProof,
} from '@linear-steps/contracts';
import fixtures from '../../../tests/fixtures/reference-cases.json';
import { crossProduct, triangleFromPoints } from './cross-product';
import { Rational } from './rational';
import { parseScalar } from './input';
import { addVectors, dotProduct, vectorNorm } from './vectors';

const text = (v: SerializedVector) =>
  v.map((x) => Rational.fromJSON(x).toString());
const scalar = (x: Parameters<typeof Rational.fromJSON>[0]) =>
  Rational.fromJSON(x);
function squared(x: ExactReal): Rational {
  if (x.kind === 'sqrt') return scalar(x.radicand);
  if (x.kind === 'quotient-sqrt')
    return scalar(x.numerator)
      .multiply(scalar(x.numerator))
      .divide(scalar(x.radicand));
  return scalar(x.value).multiply(scalar(x.value));
}
function verify(p: CrossGeometryProof) {
  const a = p.left.map(scalar),
    b = p.right.map(scalar),
    c = p.result.map(scalar);
  const dot = (u: readonly Rational[], v: readonly Rational[]) =>
    u.reduce((s, x, i) => s.add(x.multiply(v[i]!)), Rational.fromIntegers(0n));
  expect(dot(c, a).isZero()).toBe(true);
  expect(dot(c, b).isZero()).toBe(true);
  expect(dot(c, c).toJSON()).toEqual(p.squaredNorm.value);
  expect(squared(p.parallelogramArea).equals(dot(c, c))).toBe(true);
  expect(
    squared(p.triangleArea)
      .multiply(Rational.fromIntegers(4n))
      .equals(dot(c, c)),
  ).toBe(true);
  // Independent determinant minors, including the negative middle cofactor.
  const expected = [
    a[1]!.multiply(b[2]!).subtract(a[2]!.multiply(b[1]!)),
    a[0]!.multiply(b[2]!).subtract(a[2]!.multiply(b[0]!)).negate(),
    a[0]!.multiply(b[1]!).subtract(a[1]!.multiply(b[0]!)),
  ];
  expect(c.map((x) => x.toString())).toEqual(expected.map((x) => x.toString()));
  for (const s of p.steps) {
    expect(
      scalar(s.positive.left).multiply(scalar(s.positive.right)).toJSON(),
    ).toEqual(s.positive.product);
    expect(
      scalar(s.negative.left).multiply(scalar(s.negative.right)).toJSON(),
    ).toEqual(s.negative.product);
    expect(
      scalar(s.positive.product).subtract(scalar(s.negative.product)).toJSON(),
    ).toEqual(s.value);
  }
  if (p.normal.status === 'defined')
    expect(
      p.normal.unit
        .map(squared)
        .reduce((a, b) => a.add(b))
        .toString(),
    ).toBe('1');
}

it.each(fixtures.cases.filter((c) => c.operation === 'cross'))(
  'matches $id, areas and orthogonality',
  (c) => {
    const p = crossProduct(c.input.a, c.input.b).proof;
    expect(text(p.result)).toEqual(c.expected.vector);
    expect(scalar(p.squaredNorm.value).toString()).toBe(c.expected.squaredNorm);
    if (c.expected.squaredArea)
      expect(scalar(p.squaredTriangleArea).toString()).toBe(
        c.expected.squaredArea,
      );
    verify(p);
  },
);
it('executes PV-03 distributivity and PV-04 Lagrange identity', () => {
  const d = fixtures.cases.find((c) => c.id === 'PV-03')!;
  const lhs = crossProduct(
    d.input.a,
    text(addVectors(d.input.b, d.input.c).result),
  ).proof;
  const rhs = addVectors(
    text(crossProduct(d.input.a, d.input.b).proof.result),
    text(crossProduct(d.input.a, d.input.c).proof.result),
  );
  expect(text(lhs.result)).toEqual(d.expected.vector);
  expect(rhs.result).toEqual(lhs.result);
  const l = fixtures.cases.find((c) => c.id === 'PV-04')!;
  const aa = scalar(vectorNorm(l.input.a).squaredNorm.value),
    bb = scalar(vectorNorm(l.input.b).squaredNorm.value),
    ab = scalar(dotProduct(l.input.a, l.input.b).proof.value);
  const value = aa.multiply(bb).subtract(ab.multiply(ab));
  expect(value.toString()).toBe(l.expected.value);
  expect(crossProduct(l.input.a, l.input.b).proof.squaredNorm.value).toEqual(
    value.toJSON(),
  );
});
it('uses right-hand orientation and reverses the normal without changing areas', () => {
  const p = crossProduct(['1', '0', '0'], ['0', '1', '0']).proof;
  const q = crossProduct(['0', '1', '0'], ['1', '0', '0']).proof;
  expect(text(p.result)).toEqual(['0', '0', '1']);
  expect(text(q.result)).toEqual(['0', '0', '-1']);
  expect(p.normal).toEqual({
    status: 'defined',
    unit: ['0', '0', '1'].map((x) => ({
      kind: 'rational',
      value: parseScalar(x).toJSON(),
    })),
  });
  expect(q.triangleArea).toEqual(p.triangleArea);
  expect(q.normal).toEqual({
    status: 'defined',
    unit: ['0', '0', '-1'].map((x) => ({
      kind: 'rational',
      value: parseScalar(x).toJSON(),
    })),
  });
});
it.each(
  [
    ['0', '0', '0'],
    ['2', '4', '6'],
    ['-1', '-2', '-3'],
  ].map((v) => [v] as const),
)('handles zero and collinear vectors %j', (v) => {
  const p = crossProduct(['1', '2', '3'], v).proof;
  expect(text(p.result)).toEqual(['0', '0', '0']);
  expect(p.triangleArea).toEqual({
    kind: 'rational',
    value: parseScalar('0').toJSON(),
  });
  expect(p.normal).toEqual({
    status: 'undefined',
    reason: 'collinear-vectors',
  });
});
it('preserves fractional and irrational results exactly', () => {
  verify(crossProduct(['1/3', '-0,5', '2/7'], ['3/5', '2', '-1']).proof);
  const p = crossProduct(['1', '0', '0'], ['0', '1', '1']).proof;
  expect(p.parallelogramArea).toEqual({
    kind: 'sqrt',
    radicand: parseScalar('2').toJSON(),
  });
  expect(p.triangleArea).toEqual({
    kind: 'sqrt',
    radicand: parseScalar('1/2').toJSON(),
  });
  verify(p);
});
it('builds edges from a shared origin and is invariant under translation', () => {
  const r = triangleFromPoints(
    ['1', '2', '3'],
    ['3', '2', '3'],
    ['1', '5', '3'],
  );
  expect(text(r.proof.left)).toEqual(['2', '0', '0']);
  expect(text(r.proof.right)).toEqual(['0', '3', '0']);
  expect(r.proof.triangleArea).toEqual({
    kind: 'rational',
    value: parseScalar('3').toJSON(),
  });
  expect(
    triangleFromPoints(['-4', '4', '10'], ['-2', '4', '10'], ['-4', '7', '10'])
      .proof,
  ).toEqual(r.proof);
  for (const s of r.edgeSteps) {
    expect(scalar(s.first).subtract(scalar(s.origin)).toJSON()).toEqual(s.left);
    expect(scalar(s.second).subtract(scalar(s.origin)).toJSON()).toEqual(
      s.right,
    );
  }
  verify(r.proof);
});
it('handles repeated and collinear points', () => {
  expect(
    triangleFromPoints(['1', '1', '1'], ['1', '1', '1'], ['2', '3', '4']).proof
      .normal.status,
  ).toBe('undefined');
  expect(
    triangleFromPoints(['1', '1', '1'], ['2', '2', '2'], ['3', '3', '3']).proof
      .normal.status,
  ).toBe('undefined');
});
it('keeps computed edges beyond input digit limits without reparsing', () => {
  const n = '99999999999999999999999999999999';
  const p = triangleFromPoints(
    ['-' + n, '0', '0'],
    [n, '0', '0'],
    ['0', '1', '0'],
  ).proof;
  expect(scalar(p.left[0]).toString()).toBe((2n * BigInt(n)).toString());
  verify(p);
});
it.each(
  [
    [],
    ['1', '2'],
    ['1', '2', '3', '4'],
    ['1', 'a', '3'],
    ['1', '√2', '3'],
    [1, 2, 3],
    Array(3),
  ].map((v) => [v] as const),
)('rejects invalid vectors %j', (v) => {
  expect(() => crossProduct(v, ['1', '0', '0'])).toThrow();
  expect(() => crossProduct(['1', '0', '0'], v)).toThrow();
  expect(() =>
    triangleFromPoints(['0', '0', '0'], v, ['1', '0', '0']),
  ).toThrow();
});
it('returns immutable JSON-safe results without mutating inputs', () => {
  const a = Object.freeze(['1', '2', '3']),
    b = Object.freeze(['2', '4', '1']);
  const frozen = (x: unknown): void => {
    if (x && typeof x === 'object') {
      expect(Object.isFrozen(x)).toBe(true);
      Object.values(x).forEach(frozen);
    }
  };
  for (const result of [crossProduct(a, b), triangleFromPoints(a, b, a)]) {
    frozen(result);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  }
  expect(a).toEqual(['1', '2', '3']);
});
