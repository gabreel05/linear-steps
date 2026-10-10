import type {
  DeterminantExpansion,
  DeterminantOptions,
  DeterminantResult,
  DeterminantRowStep,
  SerializedMatrix,
} from '@linear-steps/contracts';
import { parseMatrix, type RationalMatrix } from './input';
import { Rational } from './rational';
import { MathInputError } from './errors';

const zero = Rational.fromIntegers(0n);
const one = Rational.fromIntegers(1n);
const snapshot = (a: RationalMatrix): SerializedMatrix =>
  Object.freeze(a.map((row) => Object.freeze(row.map((v) => v.toJSON()))));

function formula(a: RationalMatrix, sarrus = false): DeterminantExpansion {
  const n = a.length;
  const paths: { sign: 1 | -1; columns: number[] }[] = sarrus
    ? [0, 1, 2].flatMap((start) => [
        {
          sign: 1 as const,
          columns: [start, (start + 1) % 3, (start + 2) % 3],
        },
        {
          sign: -1 as const,
          columns: [start, (start + 2) % 3, (start + 1) % 3],
        },
      ])
    : n === 1
      ? [{ sign: 1, columns: [0] }]
      : [
          { sign: 1, columns: [0, 1] },
          { sign: -1, columns: [1, 0] },
        ];
  let value = zero;
  const terms = paths.map(({ sign, columns }) => {
    const product = columns.reduce(
      (p, col, row) => p.multiply(a[row]![col]!),
      one,
    );
    value = value.add(sign === 1 ? product : product.negate());
    return Object.freeze({
      sign,
      cells: Object.freeze(
        columns.map((column, row) => Object.freeze({ row, column })),
      ),
      product: product.toJSON(),
    });
  });
  return Object.freeze({
    kind: sarrus ? 'sarrus' : 'formula',
    matrix: snapshot(a),
    value: value.toJSON(),
    terms: Object.freeze(terms),
  });
}

function laplace(
  a: RationalMatrix,
  axis: 'row' | 'column',
  index: number,
): DeterminantExpansion {
  if (a.length === 1) return formula(a);
  let value = zero;
  const terms = a.map((_, k) => {
    const row = axis === 'row' ? index : k;
    const column = axis === 'column' ? index : k;
    const coefficient = a[row]![column]!;
    const sign: 1 | -1 = (row + column) % 2 === 0 ? 1 : -1;
    const minor = laplace(
      a
        .filter((_, i) => i !== row)
        .map((line) => line.filter((_, j) => j !== column)),
      'row',
      0,
    );
    let contribution = coefficient.multiply(Rational.fromJSON(minor.value));
    if (sign === -1) contribution = contribution.negate();
    value = value.add(contribution);
    return Object.freeze({
      row,
      column,
      coefficient: coefficient.toJSON(),
      sign,
      minor,
      contribution: contribution.toJSON(),
    });
  });
  return Object.freeze({
    kind: 'laplace',
    axis,
    index,
    matrix: snapshot(a),
    terms: Object.freeze(terms),
    value: value.toJSON(),
  });
}

/** Computes an exact determinant with a complete mathematical trace. No method fallback. */
export function determinant(
  input: unknown,
  options: DeterminantOptions,
): DeterminantResult {
  const a = parseMatrix(input);
  const n = a.length;
  if (a.some((row) => row.length !== n))
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'O determinante exige uma matriz quadrada.',
    );
  if (
    !options ||
    !['formula', 'sarrus', 'laplace', 'triangular'].includes(options.method)
  )
    throw new MathInputError(
      'INVALID_METHOD',
      'Escolha um método de determinante válido.',
    );
  if (options.method === 'formula' && n > 2)
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'A fórmula direta está disponível apenas nas ordens 1 e 2.',
    );
  if (options.method === 'sarrus' && n !== 3)
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'Sarrus exige uma matriz 3 × 3.',
    );
  if (options.method === 'laplace') {
    if (n > 4)
      throw new MathInputError(
        'INPUT_LIMIT',
        'Laplace está limitado à ordem 4 para manter as etapas legíveis.',
      );
    if (
      !['row', 'column'].includes(options.axis) ||
      !Number.isInteger(options.index) ||
      options.index < 0 ||
      options.index >= n
    )
      throw new MathInputError(
        'INVALID_METHOD',
        'Escolha uma linha ou coluna existente para a expansão.',
      );
  }
  const savedOptions: DeterminantOptions = Object.freeze(
    options.method === 'laplace'
      ? { method: options.method, axis: options.axis, index: options.index }
      : { method: options.method },
  );
  const base = {
    schemaVersion: 1 as const,
    algorithmVersion: 'determinant-1' as const,
    method: options.method,
    options: savedOptions,
    input: snapshot(a),
  };
  if (options.method !== 'triangular') {
    const proof =
      options.method === 'laplace'
        ? laplace(a, options.axis, options.index)
        : formula(a, options.method === 'sarrus');
    return Object.freeze({ ...base, value: proof.value, proof });
  }
  const matrix = a.map((row) => [...row]);
  let correction: 1 | -1 = 1;
  const steps: DeterminantRowStep[] = [
    Object.freeze({ kind: 'initial', matrix: snapshot(matrix), correction }),
  ];
  for (let col = 0; col < n; col++) {
    const pivot = matrix.findIndex((row, i) => i >= col && !row[col]!.isZero());
    // A zero diagonal column in the remaining block already ensures det = 0.
    // Continue so the final matrix is upper triangular even in singular cases.
    if (pivot === -1) continue;
    if (pivot !== col) {
      [matrix[col], matrix[pivot]] = [matrix[pivot]!, matrix[col]!];
      correction = correction === 1 ? -1 : 1;
      steps.push(
        Object.freeze({
          kind: 'swap',
          first: col,
          second: pivot,
          correction,
          matrix: snapshot(matrix),
        }),
      );
    }
    for (let row = col + 1; row < n; row++) {
      if (matrix[row]![col]!.isZero()) continue;
      const factor = matrix[row]![col]!.divide(matrix[col]![col]!).negate();
      matrix[row] = matrix[row]!.map((v, j) =>
        v.add(factor.multiply(matrix[col]![j]!)),
      );
      steps.push(
        Object.freeze({
          kind: 'add-row',
          source: col,
          target: row,
          factor: factor.toJSON(),
          correction,
          matrix: snapshot(matrix),
        }),
      );
    }
  }
  const product = matrix.reduce((p, row, i) => p.multiply(row[i]!), one);
  return Object.freeze({
    ...base,
    value: (correction === 1 ? product : product.negate()).toJSON(),
    proof: Object.freeze({
      kind: 'triangular',
      steps: Object.freeze(steps),
      triangular: snapshot(matrix),
      diagonalProduct: product.toJSON(),
      correction,
    }),
  });
}
