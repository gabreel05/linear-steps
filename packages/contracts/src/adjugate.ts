import type {
  DeterminantResult,
  SerializedMatrix,
  SerializedRational,
} from './index';

/** Indices are zero-based. The empty minor in order one has determinant 1. */
export type CofactorStep = Readonly<{
  row: number;
  column: number;
  sign: 1 | -1;
  minor: SerializedMatrix;
  determinant:
    DeterminantResult | Readonly<{ kind: 'empty'; value: SerializedRational }>;
  value: SerializedRational;
}>;

export type AdjugateInverseResult = Readonly<{
  schemaVersion: 1;
  algorithmVersion: 'adjugate-inverse-1';
  method: 'adjugate';
  input: SerializedMatrix;
  determinant: DeterminantResult;
  steps: readonly CofactorStep[];
  cofactors: SerializedMatrix;
  adjugate: SerializedMatrix;
}> &
  (
    | Readonly<{ classification: 'singular' }>
    | Readonly<{
        classification: 'invertible';
        factor: SerializedRational;
        inverse: SerializedMatrix;
      }>
  );
