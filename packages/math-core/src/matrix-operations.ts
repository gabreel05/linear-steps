import type {
  MatrixCellStep,
  MatrixOperationInput,
  MatrixOperationResult,
  SerializedMatrix,
} from '@linear-steps/contracts';
import { MathInputError } from './errors';
import { parseMatrix, parseScalar, type RationalMatrix } from './input';
import { Rational } from './rational';

const snapshot = (matrix: RationalMatrix): SerializedMatrix =>
  Object.freeze(matrix.map((row) => Object.freeze(row.map((v) => v.toJSON()))));

function calculate(
  input: MatrixOperationInput,
  rows: number,
  columns: number,
  cell: (row: number, column: number) => MatrixCellStep,
): MatrixOperationResult {
  const steps: MatrixCellStep[] = [];
  const result = Object.freeze(
    Array.from({ length: rows }, (_, row) =>
      Object.freeze(
        Array.from({ length: columns }, (_, column) => {
          const step = Object.freeze(cell(row, column));
          steps.push(step);
          return step.value;
        }),
      ),
    ),
  );
  return Object.freeze({
    schemaVersion: 1,
    algorithmVersion: 'matrix-operations-1',
    method: 'entrywise',
    input: Object.freeze(input),
    result,
    steps: Object.freeze(steps),
  });
}

function combine(
  operation: 'add' | 'subtract',
  a: unknown,
  b: unknown,
): MatrixOperationResult {
  const left = parseMatrix(a);
  const right = parseMatrix(b);
  if (left.length !== right.length || left[0]!.length !== right[0]!.length) {
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'Soma e subtração exigem matrizes com as mesmas dimensões.',
    );
  }
  return calculate(
    { operation, left: snapshot(left), right: snapshot(right) },
    left.length,
    left[0]!.length,
    (row, column) => {
      const x = left[row]![column]!;
      const y = right[row]![column]!;
      return {
        kind: operation,
        row,
        column,
        left: x.toJSON(),
        right: y.toJSON(),
        value: (operation === 'add' ? x.add(y) : x.subtract(y)).toJSON(),
      };
    },
  );
}

export function addMatrices(a: unknown, b: unknown): MatrixOperationResult {
  return combine('add', a, b);
}

export function subtractMatrices(
  a: unknown,
  b: unknown,
): MatrixOperationResult {
  return combine('subtract', a, b);
}

export function scaleMatrix(
  a: unknown,
  scalar: unknown,
): MatrixOperationResult {
  const matrix = parseMatrix(a);
  const factor = parseScalar(scalar);
  return calculate(
    { operation: 'scale', matrix: snapshot(matrix), scalar: factor.toJSON() },
    matrix.length,
    matrix[0]!.length,
    (row, column) => ({
      kind: 'scale',
      row,
      column,
      scalar: factor.toJSON(),
      operand: matrix[row]![column]!.toJSON(),
      value: factor.multiply(matrix[row]![column]!).toJSON(),
    }),
  );
}

export function multiplyMatrices(
  a: unknown,
  b: unknown,
): MatrixOperationResult {
  const left = parseMatrix(a);
  const right = parseMatrix(b);
  if (left[0]!.length !== right.length) {
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'O número de colunas de A deve ser igual ao número de linhas de B.',
    );
  }
  return calculate(
    { operation: 'multiply', left: snapshot(left), right: snapshot(right) },
    left.length,
    right[0]!.length,
    (row, column) => {
      let sum = Rational.fromIntegers(0n);
      const terms = Object.freeze(
        left[row]!.map((value, index) => {
          const other = right[index]![column]!;
          const product = value.multiply(other);
          sum = sum.add(product);
          return Object.freeze({
            index,
            left: value.toJSON(),
            right: other.toJSON(),
            product: product.toJSON(),
          });
        }),
      );
      return { kind: 'multiply', row, column, terms, value: sum.toJSON() };
    },
  );
}

export function transposeMatrix(a: unknown): MatrixOperationResult {
  const matrix = parseMatrix(a);
  return calculate(
    { operation: 'transpose', matrix: snapshot(matrix) },
    matrix[0]!.length,
    matrix.length,
    (row, column) => ({
      kind: 'transpose',
      row,
      column,
      sourceRow: column,
      sourceColumn: row,
      value: matrix[column]![row]!.toJSON(),
    }),
  );
}
