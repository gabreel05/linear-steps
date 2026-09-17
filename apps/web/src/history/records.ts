import {
  Rational,
  parseScalar,
  parseMatrix,
  parseVector,
  solveGaussian,
  reduceMatrix,
  invertMatrix,
} from '@linear-steps/math-core';
import { INPUT_LIMITS } from '@linear-steps/contracts';
import type { CalculationResult } from '../math-format';

export type Operation = 'system' | 'rref' | 'inverse';
export const labels: Record<Operation, string> = {
  system: 'Sistema linear',
  rref: 'Forma reduzida',
  inverse: 'Matriz inversa',
};
export type Summary = {
  id: string;
  title: string;
  operation: Operation;
  created_at: string;
};
export type SavedInput = {
  operation: Operation;
  a: string[][];
  b: string[];
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
    const method = operation === 'system' ? 'gauss' : 'gauss-jordan';
    const version = `${method}-1`;
    if (
      row.schema_version !== 1 ||
      p.schemaVersion !== 1 ||
      row.method !== method ||
      p.method !== method ||
      row.algorithm_version !== version ||
      p.algorithmVersion !== version
    )
      throw invalid();
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
