import type {
  AffineValue,
  GaussianSolution,
  GaussianStep,
  PivotPosition,
  SerializedMatrix,
  SerializedVector,
} from '@linear-steps/contracts';
import { parseLinearSystem, type RationalVector } from './input';
import { Rational } from './rational';

const ZERO = Rational.fromIntegers(0n);
const ONE = Rational.fromIntegers(1n);

function vector(values: RationalVector): SerializedVector {
  return Object.freeze(values.map((value) => value.toJSON()));
}

function snapshot(matrix: readonly RationalVector[]): SerializedMatrix {
  return Object.freeze(matrix.map(vector));
}

type Affine = { constant: Rational; parameters: Rational[] };

function affine(value: Affine): AffineValue {
  return Object.freeze({
    constant: value.constant.toJSON(),
    parameters: vector(value.parameters),
  });
}

/** Gaussian elimination with exact arithmetic and a replayable, JSON-safe trace. */
export function solveGaussian(
  coefficients: unknown,
  constants: unknown,
): GaussianSolution {
  const input = parseLinearSystem(coefficients, constants);
  const rows = input.coefficients.length;
  const columns = input.coefficients[0]!.length;
  const matrix = input.coefficients.map((row, i) => [
    ...row,
    input.constants[i]!,
  ]);
  const steps: GaussianStep[] = [
    Object.freeze({ kind: 'initial', matrix: snapshot(matrix) }),
  ];
  const pivots: PivotPosition[] = [];
  let pivotRow = 0;

  for (let column = 0; column < columns && pivotRow < rows; column++) {
    const candidate = matrix.findIndex(
      (row, i) => i >= pivotRow && !row[column]!.isZero(),
    );
    if (candidate === -1) continue;
    if (candidate !== pivotRow) {
      [matrix[pivotRow], matrix[candidate]] = [
        matrix[candidate]!,
        matrix[pivotRow]!,
      ];
      steps.push(
        Object.freeze({
          kind: 'swap',
          rows: Object.freeze([pivotRow, candidate] as const),
          matrix: snapshot(matrix),
        }),
      );
    }
    const pivot = Object.freeze({ row: pivotRow, column });
    pivots.push(pivot);
    steps.push(
      Object.freeze({ kind: 'pivot', pivot, matrix: snapshot(matrix) }),
    );
    for (let target = pivotRow + 1; target < rows; target++) {
      if (matrix[target]![column]!.isZero()) continue;
      const factor = matrix[target]![column]!.divide(
        matrix[pivotRow]![column]!,
      ).negate();
      matrix[target] = matrix[target]!.map((value, j) =>
        value.add(factor.multiply(matrix[pivotRow]![j]!)),
      );
      steps.push(
        Object.freeze({
          kind: 'add-row',
          source: pivotRow,
          target,
          factor: factor.toJSON(),
          pivot,
          matrix: snapshot(matrix),
        }),
      );
    }
    pivotRow++;
  }

  const rank = pivots.length;
  const common = {
    schemaVersion: 1 as const,
    algorithmVersion: 'gauss-1' as const,
    method: 'gauss' as const,
    input: Object.freeze({
      coefficients: snapshot(input.coefficients),
      constants: vector(input.constants),
    }),
    echelon: snapshot(matrix),
    pivots: Object.freeze(pivots),
    rank,
  };
  const contradictionRow = matrix.findIndex(
    (row) =>
      row.slice(0, columns).every((value) => value.isZero()) &&
      !row[columns]!.isZero(),
  );
  if (contradictionRow !== -1) {
    steps.push(
      Object.freeze({ kind: 'conclusion', classification: 'inconsistent' }),
    );
    return Object.freeze({
      ...common,
      classification: 'inconsistent',
      augmentedRank: rank + 1,
      contradictionRow,
      steps: Object.freeze(steps),
    });
  }

  const pivotColumns = new Set(pivots.map((pivot) => pivot.column));
  const freeColumns = Array.from({ length: columns }, (_, i) => i).filter(
    (i) => !pivotColumns.has(i),
  );
  const values: Affine[] = Array.from({ length: columns }, () => ({
    constant: ZERO,
    parameters: Array<Rational>(freeColumns.length).fill(ZERO),
  }));
  freeColumns.forEach((column, parameter) => {
    values[column]!.parameters[parameter] = ONE;
    steps.push(
      Object.freeze({
        kind: 'free-variable',
        column,
        parameter,
        value: affine(values[column]!),
      }),
    );
  });

  // Solve each pivot equation from bottom to top, carrying coefficients of free parameters.
  for (let i = pivots.length - 1; i >= 0; i--) {
    const { row, column } = pivots[i]!;
    const equation = matrix[row]!;
    const divisor = equation[column]!;
    const rhs = equation[columns]!;
    let constant = rhs;
    let parameters = Array<Rational>(freeColumns.length).fill(ZERO);
    const terms: {
      column: number;
      coefficient: ReturnType<Rational['toJSON']>;
      value: AffineValue;
    }[] = [];
    for (let j = column + 1; j < columns; j++) {
      const coefficient = equation[j]!;
      if (coefficient.isZero()) continue;
      const value = values[j]!;
      terms.push(
        Object.freeze({
          column: j,
          coefficient: coefficient.toJSON(),
          value: affine(value),
        }),
      );
      constant = constant.subtract(coefficient.multiply(value.constant));
      parameters = parameters.map((parameter, k) =>
        parameter.subtract(coefficient.multiply(value.parameters[k]!)),
      );
    }
    const value = {
      constant: constant.divide(divisor),
      parameters: parameters.map((parameter) => parameter.divide(divisor)),
    };
    values[column] = value;
    steps.push(
      Object.freeze({
        kind: 'back-substitute',
        row,
        column,
        rhs: rhs.toJSON(),
        divisor: divisor.toJSON(),
        terms: Object.freeze(terms),
        value: affine(value),
      }),
    );
  }

  const particular = vector(values.map((value) => value.constant));
  if (freeColumns.length === 0) {
    steps.push(Object.freeze({ kind: 'conclusion', classification: 'unique' }));
    return Object.freeze({
      ...common,
      classification: 'unique',
      augmentedRank: rank,
      solution: particular,
      steps: Object.freeze(steps),
    });
  }
  steps.push(Object.freeze({ kind: 'conclusion', classification: 'infinite' }));
  return Object.freeze({
    ...common,
    classification: 'infinite',
    augmentedRank: rank,
    freeColumns: Object.freeze(freeColumns),
    particular,
    directions: Object.freeze(
      freeColumns.map((_, k) =>
        vector(values.map((value) => value.parameters[k]!)),
      ),
    ),
    steps: Object.freeze(steps),
  });
}
