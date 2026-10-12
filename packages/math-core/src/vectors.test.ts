import { expect, it } from 'vitest';
import type {
  ExactReal,
  SerializedVector,
  DotProof,
} from '@linear-steps/contracts';
import fixtures from '../../../tests/fixtures/reference-cases.json';
import {
  addVectors,
  subtractVectors,
  vectorBetweenPoints,
  scaleVector,
  dotProduct,
  vectorNorm,
  normalizeVector,
  vectorAngle,
  projectVector,
  Rational,
} from './index';
const q = Rational.fromJSON;
const str = (v: SerializedVector) => v.map((x) => q(x).toString());
const zero = Rational.fromIntegers(0n);
function square(v: ExactReal): Rational {
  if (v.kind === 'sqrt') return q(v.radicand);
  if (v.kind === 'quotient-sqrt')
    return q(v.numerator).multiply(q(v.numerator)).divide(q(v.radicand));
  return q(v.value).multiply(q(v.value));
}
function frozen(value: unknown) {
  if (value && typeof value === 'object') {
    expect(Object.isFrozen(value)).toBe(true);
    Object.values(value).forEach(frozen);
  }
}
function trace(p: DotProof) {
  let sum = zero;
  p.terms.forEach((t, i) => {
    expect(t.index).toBe(i);
    const product = q(t.left).multiply(q(t.right));
    expect(product.toJSON()).toEqual(t.product);
    sum = sum.add(product);
    expect(sum.toJSON()).toEqual(t.partialSum);
  });
  expect(sum.toJSON()).toEqual(p.value);
}
it.each(fixtures.cases.filter((c) => c.operation === 'dot'))(
  'matches $id dot and norms',
  (c) => {
    const d = dotProduct(c.input.a!, c.input.b!);
    expect(q(d.proof.value).toString()).toBe(c.expected.value);
    trace(d.proof);
    expect(q(vectorNorm(c.input.a!).squaredNorm.value).toString()).toBe(
      c.expected.normSquaredA,
    );
    expect(q(vectorNorm(c.input.b!).squaredNorm.value).toString()).toBe(
      c.expected.normSquaredB,
    );
  },
);
it('matches VET-14 projection and exact distance', () => {
  const c = fixtures.cases.find((c) => c.id === 'VET-14')!;
  const r = projectVector(c.input.a!, c.input.direction!);
  if (r.status !== 'defined') throw Error('status');
  expect(str(r.projection)).toEqual(c.expected.projection);
  expect(str(r.residual)).toEqual(c.expected.residual);
  expect(q(r.squaredDistance.value).toString()).toBe(
    c.expected.squaredDistance,
  );
  expect(square(r.distance).toString()).toBe('9/2');
});
it('calculates fractions and oriented point displacement', () => {
  const a = ['1/2', '-2'],
    b = ['3/2', '1'];
  expect(str(addVectors(a, b).result)).toEqual(['2', '-1']);
  expect(str(subtractVectors(a, b).result)).toEqual(['-1', '-3']);
  expect(str(vectorBetweenPoints(a, b).result)).toEqual(['1', '3']);
  expect(str(scaleVector(a, '-2/3').result)).toEqual(['-1/3', '4/3']);
});
it.each([1, 2, 3, 4, 5, 6])(
  'verifies identities and trace at dimension %i',
  (n) => {
    const a = Array.from({ length: n }, (_, i) => String(i + 1)),
      b = Array.from({ length: n }, (_, i) => String(2 - i));
    const sum = addVectors(a, b);
    expect(str(subtractVectors(str(sum.result), b).result)).toEqual(a);
    for (const r of [
      sum,
      subtractVectors(a, b),
      vectorBetweenPoints(a, b),
      scaleVector(a, '-3'),
    ]) {
      r.steps.forEach((s) =>
        expect(q(s.value).toJSON()).toEqual(
          (s.operator === '+'
            ? q(s.left).add(q(s.right))
            : s.operator === '-'
              ? q(s.left).subtract(q(s.right))
              : q(s.left).multiply(q(s.right))
          ).toJSON(),
        ),
      );
      frozen(r);
      expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    }
    expect(dotProduct(a, b).proof.value).toEqual(dotProduct(b, a).proof.value);
    const normalized = normalizeVector(a);
    if (normalized.status !== 'defined') throw Error('status');
    expect(
      normalized.result.reduce((s, v) => s.add(square(v)), zero).toString(),
    ).toBe('1');
    const p = projectVector(a, b);
    if (p.status !== 'defined') throw Error('status');
    expect(q(p.orthogonality.value).isZero()).toBe(true);
    expect(str(addVectors(str(p.projection), str(p.residual)).result)).toEqual(
      a,
    );
    expect(projectVector(str(p.projection), b)).toMatchObject({
      projection: p.projection,
    });
    trace(p.dot);
    trace(p.squaredNormDirection);
    trace(p.orthogonality);
    trace(p.squaredDistance);
    p.steps.forEach((s) => {
      expect(q(s.direction).multiply(q(p.factor)).toJSON()).toEqual(
        s.projected,
      );
      expect(q(s.source).subtract(q(s.projected)).toJSON()).toEqual(s.residual);
    });
    expect(
      q(vectorNorm(str(p.projection)).squaredNorm.value)
        .add(q(p.squaredDistance.value))
        .toJSON(),
    ).toEqual(vectorNorm(a).squaredNorm.value);
    for (const r of [
      normalized,
      p,
      vectorAngle(a, b),
      vectorNorm(a),
      dotProduct(a, b),
    ]) {
      frozen(r);
      expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    }
  },
);
it('preserves exact roots and simplifies perfect rational squares', () => {
  expect(vectorNorm(['1', '1']).result).toEqual({
    kind: 'sqrt',
    radicand: { numerator: '2', denominator: '1' },
  });
  expect(vectorNorm(['3/5', '4/5']).result).toEqual({
    kind: 'rational',
    value: { numerator: '1', denominator: '1' },
  });
  const n = normalizeVector(['-1', '1']);
  if (n.status !== 'defined') throw Error('status');
  expect(n.result[0]).toEqual({
    kind: 'quotient-sqrt',
    numerator: { numerator: '-1', denominator: '1' },
    radicand: { numerator: '2', denominator: '1' },
  });
});
it('distinguishes valid zero operations from undefined direction operations', () => {
  expect(vectorNorm(['0', '0']).result).toEqual({
    kind: 'rational',
    value: { numerator: '0', denominator: '1' },
  });
  expect(normalizeVector(['0', '0'])).toMatchObject({
    status: 'undefined',
    reason: 'zero-vector',
  });
  expect(vectorAngle(['1', '0'], ['0', '0'])).toMatchObject({
    status: 'undefined',
    reason: 'zero-vector',
  });
  expect(projectVector(['1', '0'], ['0', '0'])).toMatchObject({
    status: 'undefined',
    reason: 'zero-direction',
  });
  expect(projectVector(['0', '0'], ['1', '0'])).toMatchObject({
    status: 'defined',
  });
  expect(dotProduct(['0', '0'], ['1', '2']).orthogonal).toBe(true);
  expect(normalizeVector(['0'])).not.toHaveProperty('result');
});
it.each([
  { a: ['1', '0'], b: ['1', '0'], angle: 0 },
  { a: ['1', '0'], b: ['-1', '0'], angle: 180 },
  { a: ['1', '0'], b: ['0', '1'], angle: 90 },
  { a: ['1', '0'], b: ['1', '1'], angle: 45 },
])(
  'computes $angle degrees without changing exact expression',
  ({ a, b, angle }) => {
    const r = vectorAngle(a, b);
    if (r.status !== 'defined') throw Error('status');
    expect(r.approximation.value).toBeCloseTo(angle, 10);
    expect(r.result.kind).toBe('arccos');
    expect(square(r.result.argument).toJSON()).toEqual(
      q(r.dot.value)
        .multiply(q(r.dot.value))
        .divide(
          q(r.squaredNormLeft.value).multiply(q(r.squaredNormRight.value)),
        )
        .toJSON(),
    );
  },
);
it('approximates nearly parallel and antiparallel vectors without overflow', () => {
  for (const sign of ['', '-']) {
    const r = vectorAngle(
      ['99999999999999999999999999999999', '1'],
      [sign + '99999999999999999999999999999999', '2'],
    );
    if (r.status !== 'defined') throw Error('status');
    expect(Number.isFinite(r.approximation.value)).toBe(true);
    expect(r.approximation.value).toBeCloseTo(sign ? 180 : 0, 10);
  }
});
it('keeps input immutable and supports normalized fractions beyond input digit limits', () => {
  const a = ['12345678901234567890123456789012.123456789012', '1'];
  const before = JSON.stringify(a);
  const r = projectVector(a, ['1', '1']);
  expect(r.status).toBe('defined');
  expect(JSON.stringify(a)).toBe(before);
  expect(normalizeVector(a).status).toBe('defined');
});
it('rejects dimension mismatch, holes, expressions and invalid scalars', () => {
  for (const fn of [
    addVectors,
    subtractVectors,
    vectorBetweenPoints,
    dotProduct,
    vectorAngle,
    projectVector,
  ])
    expect(() => fn(['1'], ['1', '2'])).toThrow();
  for (const a of [
    [],
    Array(2),
    ['√2'],
    ['a'],
    ['1/0'],
    Array<string>(7).fill('1'),
  ])
    for (const fn of [vectorNorm, normalizeVector])
      expect(() => fn(a)).toThrow();
  expect(() => scaleVector(['1'], 'a')).toThrow();
});
