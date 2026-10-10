import type { SerializedMatrix, SerializedRational } from './index';

export type DeterminantMethod = 'formula' | 'sarrus' | 'laplace' | 'triangular';
/** All coordinates and expansion indices are zero-based. */
export type DeterminantOptions =
  | Readonly<{ method: 'formula' | 'sarrus' | 'triangular' }>
  | Readonly<{ method: 'laplace'; axis: 'row' | 'column'; index: number }>;

export type DeterminantExpansion = Readonly<{
  matrix: SerializedMatrix;
  value: SerializedRational;
}> &
  (
    | Readonly<{
        kind: 'formula' | 'sarrus';
        terms: readonly Readonly<{
          sign: 1 | -1;
          cells: readonly Readonly<{ row: number; column: number }>[];
          product: SerializedRational;
        }>[];
      }>
    | Readonly<{
        kind: 'laplace';
        axis: 'row' | 'column';
        index: number;
        terms: readonly Readonly<{
          row: number;
          column: number;
          coefficient: SerializedRational;
          sign: 1 | -1;
          minor: DeterminantExpansion;
          contribution: SerializedRational;
        }>[];
      }>
  );

export type DeterminantRowStep = Readonly<{
  matrix: SerializedMatrix;
  correction: 1 | -1;
}> &
  (
    | Readonly<{ kind: 'initial' }>
    | Readonly<{ kind: 'swap'; first: number; second: number }>
    | Readonly<{
        kind: 'add-row';
        source: number;
        target: number;
        factor: SerializedRational;
      }>
  );

export type DeterminantResult = Readonly<{
  schemaVersion: 1;
  algorithmVersion: 'determinant-1';
  method: DeterminantMethod;
  options: DeterminantOptions;
  input: SerializedMatrix;
  value: SerializedRational;
  proof:
    | DeterminantExpansion
    | Readonly<{
        kind: 'triangular';
        steps: readonly DeterminantRowStep[];
        triangular: SerializedMatrix;
        diagonalProduct: SerializedRational;
        /** det(input) = correction * diagonalProduct; row scaling is not used. */
        correction: 1 | -1;
      }>;
}>;
