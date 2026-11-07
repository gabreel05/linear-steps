import type {
  SerializedRational,
  SerializedVector,
  DotProof,
  ExactReal,
} from './index';

/** Cyclic component formula a[j]b[k] - a[k]b[j], with zero-based indices. */
export type CrossComponentStep = Readonly<{
  index: number;
  j: number;
  k: number;
  positive: Readonly<{
    left: SerializedRational;
    right: SerializedRational;
    product: SerializedRational;
  }>;
  negative: Readonly<{
    left: SerializedRational;
    right: SerializedRational;
    product: SerializedRational;
  }>;
  value: SerializedRational;
}>;
export type CrossGeometryProof = Readonly<{
  left: SerializedVector;
  right: SerializedVector;
  result: SerializedVector;
  steps: readonly CrossComponentStep[];
  orthogonalityLeft: DotProof;
  orthogonalityRight: DotProof;
  squaredNorm: DotProof;
  parallelogramArea: ExactReal;
  squaredTriangleArea: SerializedRational;
  triangleArea: ExactReal;
  /** Right-hand orientation from left to right; reverse order reverses the normal. */
  normal:
    | Readonly<{ status: 'defined'; unit: readonly ExactReal[] }>
    | Readonly<{ status: 'undefined'; reason: 'collinear-vectors' }>;
}>;
type Base = Readonly<{
  schemaVersion: 1;
  algorithmVersion: 'cross-geometry-1';
  method: 'components';
  proof: CrossGeometryProof;
}>;
export type CrossProductResult = Base &
  Readonly<{
    input: Readonly<{
      operation: 'cross';
      left: SerializedVector;
      right: SerializedVector;
    }>;
  }>;
export type TriangleResult = Base &
  Readonly<{
    input: Readonly<{
      operation: 'triangle';
      origin: SerializedVector;
      first: SerializedVector;
      second: SerializedVector;
    }>;
    /** Edges first-origin and second-origin are proof.left and proof.right. */
    edgeSteps: readonly Readonly<{
      index: number;
      origin: SerializedRational;
      first: SerializedRational;
      second: SerializedRational;
      left: SerializedRational;
      right: SerializedRational;
    }>[];
  }>;
