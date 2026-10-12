import type { SerializedRational, SerializedVector } from './index';

/** Output-only expressions, not accepted by the scalar input parser. */
export type ExactReal =
  | Readonly<{ kind: 'rational'; value: SerializedRational }>
  | Readonly<{ kind: 'sqrt'; radicand: SerializedRational }>
  | Readonly<{
      kind: 'quotient-sqrt';
      numerator: SerializedRational;
      radicand: SerializedRational;
    }>;
export type DotProof = Readonly<{
  terms: readonly Readonly<{
    index: number;
    left: SerializedRational;
    right: SerializedRational;
    product: SerializedRational;
    partialSum: SerializedRational;
  }>[];
  value: SerializedRational;
}>;
export type VectorInput =
  | Readonly<{
      operation:
        'add' | 'subtract' | 'between-points' | 'dot' | 'angle' | 'projection';
      left: SerializedVector;
      right: SerializedVector;
    }>
  | Readonly<{
      operation: 'scale';
      vector: SerializedVector;
      scalar: SerializedRational;
    }>
  | Readonly<{ operation: 'norm' | 'normalize'; vector: SerializedVector }>;
type Base = Readonly<{
  schemaVersion: 1;
  algorithmVersion: 'vector-arithmetic-1';
  method: 'components';
}>;
export type VectorComponentResult = Base &
  Readonly<{
    input:
      | Extract<VectorInput, { operation: 'scale' }>
      | Readonly<{
          operation: 'add' | 'subtract' | 'between-points';
          left: SerializedVector;
          right: SerializedVector;
        }>;
    result: SerializedVector;
    steps: readonly Readonly<{
      index: number;
      left: SerializedRational;
      right: SerializedRational;
      operator: '+' | '-' | '*';
      value: SerializedRational;
    }>[];
  }>;
export type DotResult = Base &
  Readonly<{
    input: Readonly<{
      operation: 'dot';
      left: SerializedVector;
      right: SerializedVector;
    }>;
    proof: DotProof;
    orthogonal: boolean;
  }>;
export type NormResult = Base &
  Readonly<{
    input: Readonly<{ operation: 'norm'; vector: SerializedVector }>;
    squaredNorm: DotProof;
    result: ExactReal;
  }>;
export type NormalizeResult = Base &
  Readonly<{
    input: Readonly<{ operation: 'normalize'; vector: SerializedVector }>;
    squaredNorm: DotProof;
  }> &
  (
    | Readonly<{ status: 'undefined'; reason: 'zero-vector' }>
    | Readonly<{ status: 'defined'; result: readonly ExactReal[] }>
  );
export type AngleResult = Base &
  Readonly<{
    input: Readonly<{
      operation: 'angle';
      left: SerializedVector;
      right: SerializedVector;
    }>;
    dot: DotProof;
    squaredNormLeft: DotProof;
    squaredNormRight: DotProof;
  }> &
  (
    | Readonly<{ status: 'undefined'; reason: 'zero-vector' }>
    | Readonly<{
        status: 'defined';
        result: Readonly<{ kind: 'arccos'; argument: ExactReal }>;
        approximation: Readonly<{ unit: 'degrees'; value: number }>;
      }>
  );
export type ProjectionResult = Base &
  Readonly<{
    input: Readonly<{
      operation: 'projection';
      left: SerializedVector;
      right: SerializedVector;
    }>;
    dot: DotProof;
    squaredNormDirection: DotProof;
  }> &
  (
    | Readonly<{ status: 'undefined'; reason: 'zero-direction' }>
    | Readonly<{
        status: 'defined';
        factor: SerializedRational;
        projection: SerializedVector;
        residual: SerializedVector;
        steps: readonly Readonly<{
          index: number;
          source: SerializedRational;
          direction: SerializedRational;
          projected: SerializedRational;
          residual: SerializedRational;
        }>[];
        orthogonality: DotProof;
        squaredDistance: DotProof;
        distance: ExactReal;
      }>
  );
export type VectorResult =
  | VectorComponentResult
  | DotResult
  | NormResult
  | NormalizeResult
  | AngleResult
  | ProjectionResult;
