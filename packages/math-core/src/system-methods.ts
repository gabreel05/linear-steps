import type {
  CramerResult,
  InverseSystemResult,
} from '@linear-steps/contracts';
import { parseLinearSystem } from './input';
import { MathInputError } from './errors';
import { determinant } from './determinant';
import { invertMatrix } from './reduction';
import { Rational } from './rational';
function prepare(a: unknown, b: unknown) {
  const parsed = parseLinearSystem(a, b);
  if (parsed.coefficients.length !== parsed.coefficients[0]!.length)
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'Este método exige uma matriz quadrada. Use Gauss para sistemas retangulares.',
    );
  return Object.freeze({
    coefficients: Object.freeze(
      parsed.coefficients.map((row) =>
        Object.freeze(row.map((v) => v.toJSON())),
      ),
    ),
    constants: Object.freeze(parsed.constants.map((v) => v.toJSON())),
  });
}
/** Cramer is limited to order four. Singular systems require another method, never an inferred classification. */
export function solveCramer(a: unknown, b: unknown): CramerResult {
  const input = prepare(a, b);
  if (input.coefficients.length > 4)
    throw new MathInputError(
      'INPUT_LIMIT',
      'Cramer está limitado à ordem 4. Use Gauss para dimensões maiores.',
    );
  // Reuse the original validated scalar spelling; normalized fractions can exceed input digit limits.
  const d = determinant(a, { method: 'triangular' });
  const base = {
    schemaVersion: 1 as const,
    algorithmVersion: 'cramer-1' as const,
    method: 'cramer' as const,
    input,
    determinant: d,
  };
  if (Rational.fromJSON(d.value).isZero())
    return Object.freeze({
      ...base,
      status: 'not-applicable',
      reason: 'singular',
    });
  const source = a as readonly (readonly string[])[];
  const constants = b as readonly string[];
  const steps = input.constants.map((_, column) => {
    const replaced = source.map((row, i) =>
      row.map((v, j) => (j === column ? constants[i]! : v)),
    );
    const numerator = determinant(replaced, { method: 'triangular' });
    const value = Rational.fromJSON(numerator.value)
      .divide(Rational.fromJSON(d.value))
      .toJSON();
    return Object.freeze({
      column,
      replaced: numerator.input,
      determinant: numerator,
      divisor: d.value,
      value,
    });
  });
  return Object.freeze({
    ...base,
    status: 'unique',
    solution: Object.freeze(steps.map((s) => s.value)),
    steps: Object.freeze(steps),
  });
}
/** A^-1 b, with the full Gauss-Jordan inverse proof and exact dot products. */
export function solveByInverse(a: unknown, b: unknown): InverseSystemResult {
  const input = prepare(a, b);
  const inverse = invertMatrix(a);
  const base = {
    schemaVersion: 1 as const,
    algorithmVersion: 'inverse-system-1' as const,
    method: 'inverse' as const,
    input,
    inverse,
  };
  if (inverse.classification === 'singular')
    return Object.freeze({
      ...base,
      status: 'not-applicable',
      reason: 'singular',
    });
  const steps = inverse.inverse.map((line, row) => {
    let sum = Rational.fromIntegers(0n);
    const terms = line.map((coefficient, column) => {
      const constant = input.constants[column]!;
      const product = Rational.fromJSON(coefficient).multiply(
        Rational.fromJSON(constant),
      );
      sum = sum.add(product);
      return Object.freeze({
        column,
        coefficient,
        constant,
        product: product.toJSON(),
      });
    });
    return Object.freeze({
      row,
      terms: Object.freeze(terms),
      value: sum.toJSON(),
    });
  });
  return Object.freeze({
    ...base,
    status: 'unique',
    solution: Object.freeze(steps.map((s) => s.value)),
    steps: Object.freeze(steps),
  });
}
