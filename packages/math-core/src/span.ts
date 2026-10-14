import type {
  LinearCombinationResult,
  SpanBasisResult,
} from '@linear-steps/contracts';
import { parseMatrix } from './input';
import { solveGaussian } from './gaussian';

function prepare(vectors: unknown) {
  const parsed = parseMatrix(vectors);
  // Transpose validated source strings, not computed fractions: a valid decimal
  // may have a canonical numerator longer than the parser's integer limit.
  const source = vectors as readonly (readonly string[])[];
  const coefficients = parsed[0]!.map((_, row) => source.map((v) => v[row]!));
  return {
    coefficients,
    common: {
      schemaVersion: 1 as const,
      algorithmVersion: 'span-basis-1' as const,
      method: 'gauss' as const,
      vectors: Object.freeze(
        parsed.map((v) => Object.freeze(v.map((x) => x.toJSON()))),
      ),
      ambientDimension: parsed[0]!.length,
    },
  };
}

/** Solve sum(c[i] * vectors[i]) = target, preserving all coefficient families. */
export function solveLinearCombination(
  vectors: unknown,
  target: unknown,
): LinearCombinationResult {
  const { coefficients, common } = prepare(vectors);
  const system = solveGaussian(coefficients, target);
  return Object.freeze({
    ...common,
    operation: 'linear-combination',
    target: system.input.constants,
    belongsToSpan: system.classification !== 'inconsistent',
    system,
  });
}

/** Select original pivot columns, never rows of the echelon matrix, as a basis. */
export function analyzeSpan(vectors: unknown): SpanBasisResult {
  const { coefficients, common } = prepare(vectors);
  const system = solveGaussian(
    coefficients,
    coefficients.map(() => '0'),
  );
  if (system.classification === 'inconsistent') {
    throw new Error('A homogeneous system cannot be inconsistent.');
  }
  const basisIndices = Object.freeze(system.pivots.map((p) => p.column));
  const result = {
    ...common,
    operation: 'span-basis' as const,
    dimension: system.rank,
    spansAmbientSpace: system.rank === common.ambientDimension,
    isBasisOfAmbientSpace:
      system.rank === common.ambientDimension &&
      system.rank === common.vectors.length,
    basisIndices,
    basis: Object.freeze(basisIndices.map((i) => common.vectors[i]!)),
  };
  if (system.classification === 'unique') {
    return Object.freeze({ ...result, independent: true, system });
  }
  return Object.freeze({
    ...result,
    independent: false,
    system,
    dependenceRelation: system.directions[0]!,
  });
}
