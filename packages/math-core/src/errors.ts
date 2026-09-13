export type MathErrorCode =
  | 'INVALID_SCALAR'
  | 'INPUT_LIMIT'
  | 'DIVISION_BY_ZERO'
  | 'INVALID_RATIONAL'
  | 'ARITHMETIC_LIMIT'
  | 'INVALID_DIMENSIONS';

/** Stable codes for the UI; messages can be presented directly in Portuguese. */
export class MathInputError extends Error {
  override readonly name = 'MathInputError';

  constructor(
    readonly code: MathErrorCode,
    message: string,
  ) {
    super(message);
  }
}
