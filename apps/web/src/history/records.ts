import { calculateSpan, type SpanFormInput } from '../span-operations';
import {
  Rational,
  parseScalar,
  parseMatrix,
  parseVector,
  solveGaussian,
  solveCramer,
  solveByInverse,
  reduceMatrix,
  invertMatrix,
  invertByAdjugate,
  determinant,
} from '@linear-steps/math-core';
import { calculateBasic, isBasic, basicLabels } from '../matrix-operations';
import type { BasicOperation } from '../matrix-operations';
import { INPUT_LIMITS, type DeterminantOptions } from '@linear-steps/contracts';
import type { CalculationResult } from '../math-format';
import {
  calculateVector,
  isVectorOperation,
  type VectorFormInput,
} from '../vector-operations';

export type Operation =
  | 'span'
  | 'system'
  | 'rref'
  | 'inverse'
  | 'determinant'
  | 'vector'
  | BasicOperation;
export const labels: Record<Operation, string> = {
  ...basicLabels,
  vector: 'Vetores',
  span: 'Espaços vetoriais',
  system: 'Sistema linear',
  rref: 'Forma reduzida',
  inverse: 'Matriz inversa',
  determinant: 'Determinante',
};
export type Summary = {
  id: string;
  title: string;
  operation: Operation;
  created_at: string;
};
export type SavedInput = {
  vectorInput?: VectorFormInput;
  spanInput?: SpanFormInput;
  operation: Operation;
  a: string[][];
  b: string[];
  right?: string[][];
  scalar?: string;
  determinantOptions?: DeterminantOptions;
  result: CalculationResult;
};
export type Draft = { operation: Operation; result: CalculationResult };
export type RecordInsert = {
  id: string;
  title: string;
  operation: Operation;
  method: string;
  schema_version: number;
  algorithm_version: string;
  payload: CalculationResult;
};
const invalid = () =>
  new Error(
    'Este registro está inválido ou usa uma versão não compatível. O original foi preservado.',
  );
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid();
  return value as Record<string, unknown>;
}
export function summary(value: unknown): Summary {
  const row = object(value);
  if (
    typeof row.id !== 'string' ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.id) ||
    typeof row.title !== 'string' ||
    !row.title.trim() ||
    row.title.length > 120 ||
    typeof row.operation !== 'string' ||
    !Object.hasOwn(labels, row.operation) ||
    typeof row.created_at !== 'string' ||
    !Number.isFinite(Date.parse(row.created_at))
  )
    throw invalid();
  return {
    id: row.id,
    title: row.title,
    operation: row.operation as Operation,
    created_at: row.created_at,
  };
}
function vector(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6)
    throw invalid();
  return value.map((cell: unknown) => {
    const rational = Rational.fromJSON(cell);
    const ratio = rational.toString();
    try {
      parseScalar(ratio);
      return ratio;
    } catch {
      // A valid 32-digit decimal may normalize to a numerator longer than 32 digits.
      // Restore its finite decimal form without rounding or widening input limits.
      const { numerator, denominator } = rational.toJSON();
      const scale = 10n ** BigInt(INPUT_LIMITS.decimalPlaces);
      const d = BigInt(denominator);
      if (scale % d !== 0n) throw invalid();
      const n = BigInt(numerator);
      const digits = ((n < 0n ? -n : n) * (scale / d))
        .toString()
        .padStart(INPUT_LIMITS.decimalPlaces + 1, '0');
      const decimal = `${n < 0n ? '-' : ''}${digits.slice(0, -INPUT_LIMITS.decimalPlaces)}.${digits.slice(-INPUT_LIMITS.decimalPlaces)}`;
      parseScalar(decimal);
      return decimal;
    }
  });
}
function matrix(value: unknown): string[][] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6)
    throw invalid();
  return value.map(vector);
}
// Independent of JSON property order; never use unvalidated stored steps in the UI.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export function reopen(value: unknown): SavedInput {
  try {
    const row = object(value);
    const { operation } = summary(row);
    if (new TextEncoder().encode(JSON.stringify(row.payload)).length > 1048576)
      throw invalid();
    const p = object(row.payload);
    if (operation === 'span') {
      if (
        row.schema_version !== 1 ||
        p.schemaVersion !== 1 ||
        row.method !== 'gauss' ||
        p.method !== 'gauss' ||
        row.algorithm_version !== 'span-basis-1' ||
        p.algorithmVersion !== 'span-basis-1'
      )
        throw invalid();
      if (p.operation !== 'span-basis' && p.operation !== 'linear-combination')
        throw invalid();
      const vectors = matrix(p.vectors);
      const target =
        p.operation === 'linear-combination'
          ? vector(p.target)
          : vectors[0]!.map(() => '0');
      const spanInput: SpanFormInput = {
        operation: p.operation,
        vectors,
        target,
      };
      const result = calculateSpan(spanInput);
      if (canonical(result) !== canonical(p)) throw invalid();
      return { operation, a: vectors, b: target, spanInput, result };
    }
    if (operation === 'vector') {
      if (
        row.schema_version !== 1 ||
        p.schemaVersion !== 1 ||
        row.method !== 'components' ||
        p.method !== 'components' ||
        row.algorithm_version !== 'vector-arithmetic-1' ||
        p.algorithmVersion !== 'vector-arithmetic-1'
      )
        throw invalid();
      const input = object(p.input);
      if (!isVectorOperation(input.operation)) throw invalid();
      const left = vector(input.vector ?? input.left);
      const right =
        input.right === undefined ? left.map(() => '0') : vector(input.right);
      const scalar =
        input.scalar === undefined ? '1' : vector([input.scalar])[0]!;
      const vectorInput = { operation: input.operation, left, right, scalar };
      const result = calculateVector(vectorInput);
      let checked = p;
      // Exact fields must match; transcendental approximations may differ by a few ulps across engines.
      if ('approximation' in result) {
        const approximation = object(p.approximation);
        if (
          typeof approximation.value !== 'number' ||
          !Number.isFinite(approximation.value) ||
          Math.abs(approximation.value - result.approximation.value) > 1e-10
        )
          throw invalid();
        checked = {
          ...p,
          approximation: {
            ...approximation,
            value: result.approximation.value,
          },
        };
      }
      if (canonical(result) !== canonical(checked)) throw invalid();
      return { operation, a: [left], b: ['0'], vectorInput, result };
    }
    if (operation === 'inverse' && p.method === 'adjugate') {
      if (
        row.schema_version !== 1 ||
        p.schemaVersion !== 1 ||
        row.method !== p.method ||
        row.algorithm_version !== 'adjugate-inverse-1' ||
        p.algorithmVersion !== 'adjugate-inverse-1'
      )
        throw invalid();
      const a = matrix(p.input);
      const result = invertByAdjugate(a);
      if (canonical(result) !== canonical(p)) throw invalid();
      return { operation, a, b: a.map(() => '0'), result };
    }
    if (
      operation === 'system' &&
      (p.method === 'cramer' || p.method === 'inverse')
    ) {
      const version = p.method === 'cramer' ? 'cramer-1' : 'inverse-system-1';
      if (
        row.schema_version !== 1 ||
        p.schemaVersion !== 1 ||
        row.method !== p.method ||
        row.algorithm_version !== version ||
        p.algorithmVersion !== version
      )
        throw invalid();
      const input = object(p.input);
      const a = matrix(input.coefficients),
        b = vector(input.constants);
      const result =
        p.method === 'cramer' ? solveCramer(a, b) : solveByInverse(a, b);
      if (canonical(result) !== canonical(p)) throw invalid();
      return { operation, a, b, result };
    }
    if (operation === 'determinant') {
      if (
        row.schema_version !== 1 ||
        p.schemaVersion !== 1 ||
        row.algorithm_version !== 'determinant-1' ||
        p.algorithmVersion !== 'determinant-1' ||
        row.method !== p.method
      )
        throw invalid();
      const options = object(p.options) as DeterminantOptions;
      const a = matrix(p.input);
      const result = determinant(a, options);
      if (canonical(result) !== canonical(p)) throw invalid();
      return {
        operation,
        a,
        b: a.map(() => '0'),
        determinantOptions: result.options,
        result,
      };
    }
    const method = isBasic(operation)
      ? 'entrywise'
      : operation === 'system'
        ? 'gauss'
        : 'gauss-jordan';
    const version = isBasic(operation) ? 'matrix-operations-1' : `${method}-1`;
    if (
      row.schema_version !== 1 ||
      p.schemaVersion !== 1 ||
      row.method !== method ||
      p.method !== method ||
      row.algorithm_version !== version ||
      p.algorithmVersion !== version
    )
      throw invalid();
    if (isBasic(operation)) {
      const input = object(p.input);
      if (input.operation !== operation) throw invalid();
      const a = matrix(input.left ?? input.matrix);
      const right = input.right === undefined ? [['0']] : matrix(input.right);
      const scalar =
        input.scalar === undefined ? '1' : vector([input.scalar])[0]!;
      const result = calculateBasic(operation, a, right, scalar);
      if (canonical(result) !== canonical(p)) throw invalid();
      return { operation, a, b: a.map(() => '0'), right, scalar, result };
    }
    const input = operation === 'system' ? object(p.input) : null;
    const a = matrix(input ? input.coefficients : p.input);
    const b = input ? vector(input.constants) : a.map(() => '0');
    parseMatrix(a);
    parseVector(b);
    const result =
      operation === 'system'
        ? solveGaussian(a, b)
        : operation === 'rref'
          ? reduceMatrix(a)
          : invertMatrix(a);
    if (canonical(result) !== canonical(p)) throw invalid();
    return { operation, a, b, result };
  } catch {
    throw invalid();
  }
}
export function insertRecord(
  draft: Draft,
  id: string,
  title: string,
): RecordInsert {
  const row = {
    id,
    title: title.trim(),
    operation: draft.operation,
    method: draft.result.method,
    schema_version: draft.result.schemaVersion,
    algorithm_version: draft.result.algorithmVersion,
    payload: draft.result,
  };
  reopen({ ...row, created_at: new Date().toISOString() });
  return row;
}
