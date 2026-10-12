import type {
  AngleResult,
  DotProof,
  DotResult,
  ExactReal,
  NormalizeResult,
  NormResult,
  ProjectionResult,
  VectorComponentResult,
} from '@linear-steps/contracts';
import { parseScalar, parseVector, type RationalVector } from './input';
import { MathInputError } from './errors';
import { Rational } from './rational';
const base = {
  schemaVersion: 1,
  algorithmVersion: 'vector-arithmetic-1',
  method: 'components',
} as const;
const zero = Rational.fromIntegers(0n);
const snapshot = (v: RationalVector) => Object.freeze(v.map((x) => x.toJSON()));
function pair(left: unknown, right: unknown) {
  const a = parseVector(left),
    b = parseVector(right);
  if (a.length !== b.length)
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'Os vetores devem ter a mesma dimensão.',
    );
  return [a, b] as const;
}
function dot(a: RationalVector, b: RationalVector): DotProof {
  let sum = zero;
  const terms = a.map((left, index) => {
    const right = b[index]!;
    const product = left.multiply(right);
    sum = sum.add(product);
    return Object.freeze({
      index,
      left: left.toJSON(),
      right: right.toJSON(),
      product: product.toJSON(),
      partialSum: sum.toJSON(),
    });
  });
  return Object.freeze({ terms: Object.freeze(terms), value: sum.toJSON() });
}
// Integer Newton iteration avoids floating-point conversion, including for large rationals.
function integerRoot(n: bigint): bigint {
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) {
    const next = (x + n / x) / 2n;
    if (next >= x) return x;
    x = next;
  }
}
function root(value: Rational): ExactReal {
  const r = value.toJSON(),
    n = BigInt(r.numerator),
    d = BigInt(r.denominator);
  const sn = integerRoot(n),
    sd = integerRoot(d);
  return sn * sn === n && sd * sd === d
    ? Object.freeze({
        kind: 'rational',
        value: Rational.fromIntegers(sn, sd).toJSON(),
      })
    : Object.freeze({ kind: 'sqrt', radicand: r });
}
function overRoot(value: Rational, radicand: Rational): ExactReal {
  if (value.isZero())
    return Object.freeze({ kind: 'rational', value: zero.toJSON() });
  const denominator = root(radicand);
  return denominator.kind === 'rational'
    ? Object.freeze({
        kind: 'rational',
        value: value.divide(Rational.fromJSON(denominator.value)).toJSON(),
      })
    : Object.freeze({
        kind: 'quotient-sqrt',
        numerator: value.toJSON(),
        radicand: radicand.toJSON(),
      });
}
function components(
  operation: 'add' | 'subtract' | 'between-points',
  left: unknown,
  right: unknown,
): VectorComponentResult {
  const [a, b] = pair(left, right);
  const steps = a.map((v, index) => {
    const l = operation === 'between-points' ? b[index]! : v;
    const r = operation === 'between-points' ? v : b[index]!;
    return Object.freeze({
      index,
      left: l.toJSON(),
      right: r.toJSON(),
      operator: operation === 'add' ? ('+' as const) : ('-' as const),
      value: (operation === 'add' ? l.add(r) : l.subtract(r)).toJSON(),
    });
  });
  return Object.freeze({
    ...base,
    input: Object.freeze({ operation, left: snapshot(a), right: snapshot(b) }),
    steps: Object.freeze(steps),
    result: Object.freeze(steps.map((s) => s.value)),
  });
}
export const addVectors = (a: unknown, b: unknown) => components('add', a, b);
export const subtractVectors = (a: unknown, b: unknown) =>
  components('subtract', a, b);
/** Displacement from the first point to the second: end - start. */
export const vectorBetweenPoints = (start: unknown, end: unknown) =>
  components('between-points', start, end);
export function scaleVector(
  input: unknown,
  scalar: unknown,
): VectorComponentResult {
  const a = parseVector(input),
    s = parseScalar(scalar);
  const steps = a.map((v, index) =>
    Object.freeze({
      index,
      left: s.toJSON(),
      right: v.toJSON(),
      operator: '*' as const,
      value: s.multiply(v).toJSON(),
    }),
  );
  return Object.freeze({
    ...base,
    input: Object.freeze({
      operation: 'scale',
      vector: snapshot(a),
      scalar: s.toJSON(),
    }),
    steps: Object.freeze(steps),
    result: Object.freeze(steps.map((s) => s.value)),
  });
}
export function dotProduct(left: unknown, right: unknown): DotResult {
  const [a, b] = pair(left, right),
    proof = dot(a, b);
  return Object.freeze({
    ...base,
    input: Object.freeze({
      operation: 'dot',
      left: snapshot(a),
      right: snapshot(b),
    }),
    proof,
    orthogonal: Rational.fromJSON(proof.value).isZero(),
  });
}
export function vectorNorm(input: unknown): NormResult {
  const a = parseVector(input),
    squaredNorm = dot(a, a);
  return Object.freeze({
    ...base,
    input: Object.freeze({ operation: 'norm', vector: snapshot(a) }),
    squaredNorm,
    result: root(Rational.fromJSON(squaredNorm.value)),
  });
}
export function normalizeVector(input: unknown): NormalizeResult {
  const a = parseVector(input),
    squaredNorm = dot(a, a),
    square = Rational.fromJSON(squaredNorm.value);
  const common = {
    ...base,
    input: Object.freeze({
      operation: 'normalize' as const,
      vector: snapshot(a),
    }),
    squaredNorm,
  };
  return square.isZero()
    ? Object.freeze({ ...common, status: 'undefined', reason: 'zero-vector' })
    : Object.freeze({
        ...common,
        status: 'defined',
        result: Object.freeze(a.map((v) => overRoot(v, square))),
      });
}
// Convert only bounded, nonnegative squared trigonometric ratios. Avoid Infinity/Infinity.
function unitRatio(value: Rational): number {
  const r = value.toJSON();
  return (
    Number((BigInt(r.numerator) * 10n ** 32n) / BigInt(r.denominator)) / 1e32
  );
}
export function vectorAngle(left: unknown, right: unknown): AngleResult {
  const [a, b] = pair(left, right),
    product = dot(a, b),
    aa = dot(a, a),
    bb = dot(b, b);
  const common = {
    ...base,
    input: Object.freeze({
      operation: 'angle' as const,
      left: snapshot(a),
      right: snapshot(b),
    }),
    dot: product,
    squaredNormLeft: aa,
    squaredNormRight: bb,
  };
  const square = Rational.fromJSON(aa.value).multiply(
    Rational.fromJSON(bb.value),
  );
  if (square.isZero())
    return Object.freeze({
      ...common,
      status: 'undefined',
      reason: 'zero-vector',
    });
  const d = Rational.fromJSON(product.value),
    d2 = d.multiply(d);
  const sin = Math.sqrt(unitRatio(square.subtract(d2).divide(square)));
  const cos =
    Math.sqrt(unitRatio(d2.divide(square))) *
    (d.toJSON().numerator.startsWith('-') ? -1 : 1);
  return Object.freeze({
    ...common,
    status: 'defined',
    result: Object.freeze({ kind: 'arccos', argument: overRoot(d, square) }),
    approximation: Object.freeze({
      unit: 'degrees',
      value: (Math.atan2(sin, cos) * 180) / Math.PI,
    }),
  });
}
export function projectVector(left: unknown, right: unknown): ProjectionResult {
  const [a, b] = pair(left, right),
    product = dot(a, b),
    squaredNormDirection = dot(b, b);
  const common = {
    ...base,
    input: Object.freeze({
      operation: 'projection' as const,
      left: snapshot(a),
      right: snapshot(b),
    }),
    dot: product,
    squaredNormDirection,
  };
  const denominator = Rational.fromJSON(squaredNormDirection.value);
  if (denominator.isZero())
    return Object.freeze({
      ...common,
      status: 'undefined',
      reason: 'zero-direction',
    });
  const factor = Rational.fromJSON(product.value).divide(denominator);
  const projected = b.map((v) => v.multiply(factor)),
    residual = a.map((v, i) => v.subtract(projected[i]!));
  const squaredDistance = dot(residual, residual);
  const steps = a.map((v, index) =>
    Object.freeze({
      index,
      source: v.toJSON(),
      direction: b[index]!.toJSON(),
      projected: projected[index]!.toJSON(),
      residual: residual[index]!.toJSON(),
    }),
  );
  return Object.freeze({
    ...common,
    status: 'defined',
    factor: factor.toJSON(),
    projection: snapshot(projected),
    residual: snapshot(residual),
    steps: Object.freeze(steps),
    orthogonality: dot(residual, b),
    squaredDistance,
    distance: root(Rational.fromJSON(squaredDistance.value)),
  });
}
