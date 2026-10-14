import type {
  GaussianSolution,
  SerializedMatrix,
  SerializedVector,
} from './gaussian';

type SpanCommon = Readonly<{
  schemaVersion: 1;
  algorithmVersion: 'span-basis-1';
  method: 'gauss';
  /** Each item is an original vector; the system uses these vectors as columns. */
  vectors: SerializedMatrix;
  ambientDimension: number;
}>;

export type LinearCombinationResult = SpanCommon &
  Readonly<{
    operation: 'linear-combination';
    target: SerializedVector;
    belongsToSpan: boolean;
    /** Coefficients, including all free parameters, or a contradiction. */
    system: GaussianSolution;
  }>;

export type SpanBasisResult = SpanCommon &
  Readonly<{
    operation: 'span-basis';
    dimension: number;
    spansAmbientSpace: boolean;
    isBasisOfAmbientSpace: boolean;
    /** Zero-based indices into vectors, in original order. */
    basisIndices: readonly number[];
    basis: SerializedMatrix;
  }> &
  (
    | Readonly<{
        independent: true;
        system: Extract<GaussianSolution, { classification: 'unique' }>;
      }>
    | Readonly<{
        independent: false;
        system: Extract<GaussianSolution, { classification: 'infinite' }>;
        /** Nonzero coefficients whose combination of the original vectors is zero. */
        dependenceRelation: SerializedVector;
      }>
  );
