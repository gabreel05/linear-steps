import type { SerializedRational } from './index';

export type SerializedVector = readonly SerializedRational[];
export type SerializedMatrix = readonly SerializedVector[];
/** All indices are zero-based. Parameter k belongs to freeColumns[k]. */
export type PivotPosition = Readonly<{ row: number; column: number }>;
export type AffineValue = Readonly<{
  constant: SerializedRational;
  parameters: SerializedVector;
}>;

export type GaussianStep =
  | Readonly<{ kind: 'initial'; matrix: SerializedMatrix }>
  | Readonly<{ kind: 'pivot'; matrix: SerializedMatrix; pivot: PivotPosition }>
  | Readonly<{
      kind: 'swap';
      matrix: SerializedMatrix;
      rows: readonly [number, number];
    }>
  | Readonly<{
      kind: 'add-row';
      matrix: SerializedMatrix;
      source: number;
      target: number;
      factor: SerializedRational;
      pivot: PivotPosition;
    }>
  | Readonly<{
      kind: 'free-variable';
      column: number;
      parameter: number;
      value: AffineValue;
    }>
  | Readonly<{
      kind: 'back-substitute';
      row: number;
      column: number;
      rhs: SerializedRational;
      divisor: SerializedRational;
      terms: readonly Readonly<{
        column: number;
        coefficient: SerializedRational;
        value: AffineValue;
      }>[];
      value: AffineValue;
    }>
  | Readonly<{
      kind: 'conclusion';
      classification: 'unique' | 'infinite' | 'inconsistent';
    }>;

type GaussianCommon = Readonly<{
  schemaVersion: 1;
  algorithmVersion: 'gauss-1';
  method: 'gauss';
  input: Readonly<{
    coefficients: SerializedMatrix;
    constants: SerializedVector;
  }>;
  echelon: SerializedMatrix;
  pivots: readonly PivotPosition[];
  rank: number;
  steps: readonly GaussianStep[];
}>;

export type GaussianSolution = GaussianCommon &
  (
    | Readonly<{
        classification: 'unique';
        augmentedRank: number;
        solution: SerializedVector;
      }>
    | Readonly<{
        classification: 'infinite';
        augmentedRank: number;
        freeColumns: readonly number[];
        /** x = particular + sum(parameter[k] * directions[k]). */
        particular: SerializedVector;
        directions: readonly SerializedVector[];
      }>
    | Readonly<{
        classification: 'inconsistent';
        augmentedRank: number;
        contradictionRow: number;
      }>
  );
