/** JSON-safe rational representation. Validation belongs to the math core. */
export type SerializedRational = Readonly<{
  numerator: string;
  denominator: string;
}>;

export type SystemClassification = 'unique' | 'infinite' | 'inconsistent';

export { INPUT_LIMITS } from './limits';
export type { LinearCombinationResult, SpanBasisResult } from './span';
export type {
  DeterminantMethod,
  DeterminantOptions,
  DeterminantExpansion,
  DeterminantRowStep,
  DeterminantResult,
} from './determinant';
export type {
  MatrixCellStep,
  MatrixOperationInput,
  MatrixOperationResult,
} from './matrix-operations';
export type {
  ReductionStep,
  ReductionResult,
  InverseResult,
} from './reduction';
export type {
  SerializedVector,
  SerializedMatrix,
  PivotPosition,
  AffineValue,
  GaussianStep,
  GaussianSolution,
} from './gaussian';
export type { CramerResult, InverseSystemResult } from './system-methods';
export type { CofactorStep, AdjugateInverseResult } from './adjugate';
export type {
  ExactReal,
  DotProof,
  VectorInput,
  VectorComponentResult,
  DotResult,
  NormResult,
  NormalizeResult,
  AngleResult,
  ProjectionResult,
  VectorResult,
} from './vectors';
