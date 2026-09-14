import type {
  GaussianStep,
  PivotPosition,
  SerializedMatrix,
  SerializedRational,
} from './index';

export type ReductionStep =
  | Extract<GaussianStep, { kind: 'initial' | 'pivot' | 'swap' | 'add-row' }>
  | Readonly<{
      kind: 'scale-row';
      matrix: SerializedMatrix;
      row: number;
      factor: SerializedRational;
      pivot: PivotPosition;
    }>;

export type ReductionResult = Readonly<{
  schemaVersion: 1;
  algorithmVersion: 'gauss-jordan-1';
  method: 'gauss-jordan';
  input: SerializedMatrix;
  reduced: SerializedMatrix;
  rank: number;
  pivots: readonly PivotPosition[];
  steps: readonly ReductionStep[];
}>;

/** reduced and step matrices represent [A | I]; pivots and rank refer only to A. */
export type InverseResult = ReductionResult &
  (
    | Readonly<{ classification: 'invertible'; inverse: SerializedMatrix }>
    | Readonly<{ classification: 'singular' }>
  );
