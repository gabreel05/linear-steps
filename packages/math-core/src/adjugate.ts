import type {
  AdjugateInverseResult,
  CofactorStep,
} from '@linear-steps/contracts';
import { parseMatrix } from './input';
import { determinant } from './determinant';
import { MathInputError } from './errors';
import { Rational } from './rational';

/** A^-1 = transpose(C) / det(A), with every signed minor preserved. */
export function invertByAdjugate(input: unknown): AdjugateInverseResult {
  const a = parseMatrix(input);
  const n = a.length;
  if (a.some((row) => row.length !== n))
    throw new MathInputError(
      'INVALID_DIMENSIONS',
      'A inversa por adjunta exige uma matriz quadrada.',
    );
  if (n > 4)
    throw new MathInputError(
      'INPUT_LIMIT',
      'A inversa por adjunta está limitada à ordem 4. Use Gauss–Jordan para dimensões maiores.',
    );
  // Keep validated source spelling: canonical fractions can exceed input digit limits.
  const source = input as readonly (readonly string[])[];
  const proof = determinant(input, {
    method: 'laplace',
    axis: 'row',
    index: 0,
  });
  const one = Rational.fromIntegers(1n);
  const steps: CofactorStep[] = [];
  const cofactors = Object.freeze(
    a.map((line, row) =>
      Object.freeze(
        line.map((_, column) => {
          const minor = source
            .filter((_, i) => i !== row)
            .map((r) => r.filter((_, j) => j !== column));
          const d =
            n === 1
              ? Object.freeze({ kind: 'empty' as const, value: one.toJSON() })
              : determinant(minor, {
                  method: 'laplace',
                  axis: 'row',
                  index: 0,
                });
          const sign = (row + column) % 2 === 0 ? 1 : -1;
          const value = Rational.fromJSON(d.value)
            .multiply(Rational.fromIntegers(BigInt(sign)))
            .toJSON();
          steps.push(
            Object.freeze({
              row,
              column,
              sign,
              minor: 'input' in d ? d.input : Object.freeze([]),
              determinant: d,
              value,
            }),
          );
          return value;
        }),
      ),
    ),
  );
  const adjugate = Object.freeze(
    a.map((_, row) =>
      Object.freeze(a.map((_, column) => cofactors[column]![row]!)),
    ),
  );
  const base = {
    schemaVersion: 1 as const,
    algorithmVersion: 'adjugate-inverse-1' as const,
    method: 'adjugate' as const,
    input: proof.input,
    determinant: proof,
    steps: Object.freeze(steps),
    cofactors,
    adjugate,
  };
  const d = Rational.fromJSON(proof.value);
  if (d.isZero()) return Object.freeze({ ...base, classification: 'singular' });
  const factor = one.divide(d);
  const inverse = Object.freeze(
    adjugate.map((row) =>
      Object.freeze(
        row.map((v) => Rational.fromJSON(v).multiply(factor).toJSON()),
      ),
    ),
  );
  return Object.freeze({
    ...base,
    classification: 'invertible',
    factor: factor.toJSON(),
    inverse,
  });
}
