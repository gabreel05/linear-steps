import type {
  InverseResult,
  PivotPosition,
  ReductionResult,
  ReductionStep,
  SerializedMatrix,
} from '@linear-steps/contracts';
import { MathInputError } from './errors';
import { parseMatrix, type RationalMatrix } from './input';
import { Rational } from './rational';

const ONE = Rational.fromIntegers(1n);
const ZERO = Rational.fromIntegers(0n);
const snapshot = (matrix: RationalMatrix): SerializedMatrix =>
  Object.freeze(
    matrix.map((row) => Object.freeze(row.map((value) => value.toJSON()))),
  );

// Augmented columns participate in operations, but never supply pivots for inversion.
function reduce(
  input: RationalMatrix,
  matrix: Rational[][],
  columns: number,
): ReductionResult {
  const steps: ReductionStep[] = [
    Object.freeze({ kind: 'initial', matrix: snapshot(matrix) }),
  ];
  const pivots: PivotPosition[] = [];
  for (
    let column = 0;
    column < columns && pivots.length < matrix.length;
    column++
  ) {
    const row = pivots.length;
    const candidate = matrix.findIndex(
      (values, i) => i >= row && !values[column]!.isZero(),
    );
    if (candidate < 0) continue;
    if (candidate !== row) {
      [matrix[row], matrix[candidate]] = [matrix[candidate]!, matrix[row]!];
      steps.push(
        Object.freeze({
          kind: 'swap',
          rows: Object.freeze([row, candidate] as const),
          matrix: snapshot(matrix),
        }),
      );
    }
    const pivot = Object.freeze({ row, column });
    pivots.push(pivot);
    steps.push(
      Object.freeze({ kind: 'pivot', pivot, matrix: snapshot(matrix) }),
    );
    if (!matrix[row]![column]!.equals(ONE)) {
      const factor = ONE.divide(matrix[row]![column]!);
      matrix[row] = matrix[row]!.map((value) => value.multiply(factor));
      steps.push(
        Object.freeze({
          kind: 'scale-row',
          row,
          factor: factor.toJSON(),
          pivot,
          matrix: snapshot(matrix),
        }),
      );
    }
    for (let target = 0; target < matrix.length; target++) {
      if (target === row || matrix[target]![column]!.isZero()) continue;
      const factor = matrix[target]![column]!.negate();
      matrix[target] = matrix[target]!.map((value, j) =>
        value.add(factor.multiply(matrix[row]![j]!)),
      );
      steps.push(
        Object.freeze({
          kind: 'add-row',
          source: row,
          target,
          factor: factor.toJSON(),
          pivot,
          matrix: snapshot(matrix),
        }),
      );
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    algorithmVersion: 'gauss-jordan-1',
    method: 'gauss-jordan',
    input: snapshot(input),
    reduced: snapshot(matrix),
    rank: pivots.length,
    pivots: Object.freeze(pivots),
    steps: Object.freeze(steps),
  });
}

/** Exact reduced row echelon form of a matrix; every input column may contain a pivot. */
export function reduceMatrix(value: unknown): ReductionResult {
  const input = parseMatrix(value);
  return reduce(
    input,
    input.map((row) => [...row]),
    input[0]!.length,
  );
}

/** Inverse via [A | I] -> [I | A^-1]. Singularity is a mathematical result, not an input error. */
export function invertMatrix(value: unknown): InverseResult {
  const input = parseMatrix(value);
  const size = input.length;
  if (input[0]!.length !== size)
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'A inversa exige uma matriz quadrada.',
    );
  const augmented = input.map((row, i) => [
    ...row,
    ...Array.from({ length: size }, (_, j) => (i === j ? ONE : ZERO)),
  ]);
  const result = reduce(input, augmented, size);
  if (result.rank !== size)
    return Object.freeze({ ...result, classification: 'singular' });
  return Object.freeze({
    ...result,
    classification: 'invertible',
    inverse: Object.freeze(
      result.reduced.map((row) => Object.freeze(row.slice(size))),
    ),
  });
}
