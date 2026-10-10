import type { SerializedMatrix, SerializedRational } from './index';

/** Coordinates are zero-based. Steps are ordered by output row, then column. */
export type MatrixCellStep = Readonly<{
  row: number;
  column: number;
  value: SerializedRational;
}> &
  (
    | Readonly<{
        kind: 'add' | 'subtract';
        left: SerializedRational;
        right: SerializedRational;
      }>
    | Readonly<{
        kind: 'scale';
        scalar: SerializedRational;
        operand: SerializedRational;
      }>
    | Readonly<{
        kind: 'multiply';
        terms: readonly Readonly<{
          index: number;
          left: SerializedRational;
          right: SerializedRational;
          product: SerializedRational;
        }>[];
      }>
    | Readonly<{
        kind: 'transpose';
        sourceRow: number;
        sourceColumn: number;
      }>
  );

export type MatrixOperationInput =
  | Readonly<{
      operation: 'add' | 'subtract' | 'multiply';
      left: SerializedMatrix;
      right: SerializedMatrix;
    }>
  | Readonly<{
      operation: 'scale';
      matrix: SerializedMatrix;
      scalar: SerializedRational;
    }>
  | Readonly<{ operation: 'transpose'; matrix: SerializedMatrix }>;

export type MatrixOperationResult = Readonly<{
  schemaVersion: 1;
  algorithmVersion: 'matrix-operations-1';
  method: 'entrywise';
  input: MatrixOperationInput;
  result: SerializedMatrix;
  steps: readonly MatrixCellStep[];
}>;
