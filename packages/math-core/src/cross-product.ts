import type {
  CrossGeometryProof,
  CrossProductResult,
  TriangleResult,
} from '@linear-steps/contracts';
import { parseVector, type RationalVector } from './input';
import { Rational } from './rational';
import { MathInputError } from './errors';
import { dot, root, overRoot } from './vector-math';

const base = {
  schemaVersion: 1,
  algorithmVersion: 'cross-geometry-1',
  method: 'components',
} as const;
const snapshot = (v: RationalVector) => Object.freeze(v.map((x) => x.toJSON()));
function vector3(input: unknown) {
  const v = parseVector(input);
  if (v.length !== 3)
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'O produto vetorial exige vetores ou pontos em R³.',
    );
  return v;
}
function geometry(a: RationalVector, b: RationalVector): CrossGeometryProof {
  const steps = [0, 1, 2].map((index) => {
    const j = (index + 1) % 3,
      k = (index + 2) % 3;
    const positive = a[j]!.multiply(b[k]!),
      negative = a[k]!.multiply(b[j]!);
    return Object.freeze({
      index,
      j,
      k,
      positive: Object.freeze({
        left: a[j]!.toJSON(),
        right: b[k]!.toJSON(),
        product: positive.toJSON(),
      }),
      negative: Object.freeze({
        left: a[k]!.toJSON(),
        right: b[j]!.toJSON(),
        product: negative.toJSON(),
      }),
      value: positive.subtract(negative).toJSON(),
    });
  });
  const result = steps.map((s) => Rational.fromJSON(s.value));
  const squaredNorm = dot(result, result),
    square = Rational.fromJSON(squaredNorm.value);
  const squaredTriangleArea = square.divide(Rational.fromIntegers(4n));
  return Object.freeze({
    left: snapshot(a),
    right: snapshot(b),
    result: snapshot(result),
    steps: Object.freeze(steps),
    orthogonalityLeft: dot(result, a),
    orthogonalityRight: dot(result, b),
    squaredNorm,
    parallelogramArea: root(square),
    squaredTriangleArea: squaredTriangleArea.toJSON(),
    triangleArea: root(squaredTriangleArea),
    normal: square.isZero()
      ? Object.freeze({ status: 'undefined', reason: 'collinear-vectors' })
      : Object.freeze({
          status: 'defined',
          unit: Object.freeze(result.map((v) => overRoot(v, square))),
        }),
  });
}
/** Cross product of two directed edges, with exact areas and an oriented unit normal. */
export function crossProduct(
  left: unknown,
  right: unknown,
): CrossProductResult {
  const a = vector3(left),
    b = vector3(right);
  return Object.freeze({
    ...base,
    input: Object.freeze({
      operation: 'cross',
      left: snapshot(a),
      right: snapshot(b),
    }),
    proof: geometry(a, b),
  });
}
/** Triangle determined by three points. Both edges use the same origin. */
export function triangleFromPoints(
  origin: unknown,
  first: unknown,
  second: unknown,
): TriangleResult {
  const o = vector3(origin),
    a = vector3(first),
    b = vector3(second);
  const left = a.map((v, i) => v.subtract(o[i]!)),
    right = b.map((v, i) => v.subtract(o[i]!));
  return Object.freeze({
    ...base,
    input: Object.freeze({
      operation: 'triangle',
      origin: snapshot(o),
      first: snapshot(a),
      second: snapshot(b),
    }),
    edgeSteps: Object.freeze(
      o.map((v, index) =>
        Object.freeze({
          index,
          origin: v.toJSON(),
          first: a[index]!.toJSON(),
          second: b[index]!.toJSON(),
          left: left[index]!.toJSON(),
          right: right[index]!.toJSON(),
        }),
      ),
    ),
    proof: geometry(left, right),
  });
}
