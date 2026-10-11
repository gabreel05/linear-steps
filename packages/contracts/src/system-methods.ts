import type {
  DeterminantResult,
  InverseResult,
  SerializedMatrix,
  SerializedVector,
  SerializedRational,
} from './index';
type Base = Readonly<{
  schemaVersion: 1;
  input: Readonly<{
    coefficients: SerializedMatrix;
    constants: SerializedVector;
  }>;
}>;
type Outcome =
  | Readonly<{ status: 'not-applicable'; reason: 'singular' }>
  | Readonly<{ status: 'unique'; solution: SerializedVector }>;
export type CramerResult = Base &
  Readonly<{
    method: 'cramer';
    algorithmVersion: 'cramer-1';
    determinant: DeterminantResult;
  }> &
  (
    | Readonly<{ status: 'not-applicable'; reason: 'singular' }>
    | Readonly<{
        status: 'unique';
        solution: SerializedVector;
        steps: readonly Readonly<{
          column: number;
          replaced: SerializedMatrix;
          determinant: DeterminantResult;
          divisor: SerializedRational;
          value: SerializedRational;
        }>[];
      }>
  );
export type InverseSystemResult = Base &
  Readonly<{
    method: 'inverse';
    algorithmVersion: 'inverse-system-1';
    inverse: InverseResult;
  }> &
  (
    | Exclude<Outcome, { status: 'unique' }>
    | Readonly<{
        status: 'unique';
        solution: SerializedVector;
        steps: readonly Readonly<{
          row: number;
          terms: readonly Readonly<{
            column: number;
            coefficient: SerializedRational;
            constant: SerializedRational;
            product: SerializedRational;
          }>[];
          value: SerializedRational;
        }>[];
      }>
  );
