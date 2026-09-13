/** JSON-safe rational representation. Validation belongs to the math core. */
export type SerializedRational = Readonly<{
  numerator: string;
  denominator: string;
}>;

export type SystemClassification = 'unique' | 'infinite' | 'inconsistent';

export { INPUT_LIMITS } from './limits';
export type {
  SerializedVector,
  SerializedMatrix,
  PivotPosition,
  AffineValue,
  GaussianStep,
  GaussianSolution,
} from './gaussian';
