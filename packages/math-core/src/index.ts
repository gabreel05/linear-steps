export { Rational } from './rational';
export { determinant } from './determinant';
export { solveGaussian } from './gaussian';
export { reduceMatrix, invertMatrix } from './reduction';
export {
  addMatrices,
  subtractMatrices,
  scaleMatrix,
  multiplyMatrices,
  transposeMatrix,
} from './matrix-operations';
export { MathInputError, type MathErrorCode } from './errors';
export {
  parseScalar,
  parseVector,
  parseMatrix,
  parseLinearSystem,
  type RationalVector,
  type RationalMatrix,
  type LinearSystemInput,
} from './input';
export type {
  SerializedRational,
  SystemClassification,
} from '@linear-steps/contracts';
