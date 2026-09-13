import { describe, expect, it } from 'vitest';
import type {
  GaussianSolution,
  SerializedVector,
} from '@linear-steps/contracts';
import fixtures from '../../../tests/fixtures/reference-cases.json';
import { solveGaussian } from './gaussian';
import { Rational } from './rational';

const zero = Rational.fromIntegers(0n);
const strings = (values: SerializedVector) =>
  values.map((value) => Rational.fromJSON(value).toString());

function checkEquations(
  result: GaussianSolution,
  values: SerializedVector,
  homogeneous = false,
) {
  result.input.coefficients.forEach((row, i) => {
    const lhs = row.reduce(
      (sum, cell, j) =>
        sum.add(
          Rational.fromJSON(cell).multiply(Rational.fromJSON(values[j]!)),
        ),
      zero,
    );
    expect(
      lhs.equals(
        homogeneous ? zero : Rational.fromJSON(result.input.constants[i]!),
      ),
    ).toBe(true);
  });
}

function checkTrace(result: GaussianSolution) {
  const current = result.input.coefficients.map((row, i) =>
    [...row, result.input.constants[i]!].map(Rational.fromJSON),
  );
  for (const step of result.steps) {
    if (step.kind === 'swap') {
      const [a, b] = step.rows;
      [current[a], current[b]] = [current[b]!, current[a]!];
    } else if (step.kind === 'add-row') {
      expect(step.target).not.toBe(step.source);
      const factor = Rational.fromJSON(step.factor);
      current[step.target] = current[step.target]!.map((value, j) =>
        value.add(factor.multiply(current[step.source]![j]!)),
      );
      expect(current[step.target]![step.pivot.column]!.isZero()).toBe(true);
    } else if (step.kind === 'pivot') {
      expect(current[step.pivot.row]![step.pivot.column]!.isZero()).toBe(false);
    } else if (step.kind === 'back-substitute') {
      // Check divisor * x + sum(coefficients * substituted values) = rhs,
      // separately for the constant and every free-parameter coefficient.
      const divisor = Rational.fromJSON(step.divisor);
      const sum = step.terms.reduce(
        (total, term) =>
          total.add(
            Rational.fromJSON(term.coefficient).multiply(
              Rational.fromJSON(term.value.constant),
            ),
          ),
        divisor.multiply(Rational.fromJSON(step.value.constant)),
      );
      expect(sum.equals(Rational.fromJSON(step.rhs))).toBe(true);
      step.value.parameters.forEach((value, k) => {
        const parameterSum = step.terms.reduce(
          (total, term) =>
            total.add(
              Rational.fromJSON(term.coefficient).multiply(
                Rational.fromJSON(term.value.parameters[k]!),
              ),
            ),
          divisor.multiply(Rational.fromJSON(value)),
        );
        expect(parameterSum.isZero()).toBe(true);
      });
    }
    if ('matrix' in step)
      expect(current.map((row) => row.map(String))).toEqual(
        step.matrix.map(strings),
      );
  }
  expect(current.map((row) => row.map(String))).toEqual(
    result.echelon.map(strings),
  );
  result.pivots.forEach((pivot, i) => {
    if (i > 0)
      expect(pivot.column).toBeGreaterThan(result.pivots[i - 1]!.column);
    for (let row = pivot.row + 1; row < current.length; row++)
      expect(current[row]![pivot.column]!.isZero()).toBe(true);
  });
}

describe('Gaussian elimination', () => {
  for (const reference of fixtures.cases) {
    if (reference.operation !== 'solve') continue;
    it(`solves course reference ${reference.id} and replays every row operation`, () => {
      const rhs = reference.input.rhs;
      const expected = reference.expected.solution;
      if (!rhs || !expected) throw new Error('Incomplete solve fixture');
      const result = solveGaussian(
        reference.input.matrix,
        rhs.map((row) => row[0]),
      );
      expect(result.classification).toBe('unique');
      if (result.classification !== 'unique')
        throw new Error('Expected unique solution');
      expect(strings(result.solution)).toEqual(expected.map((row) => row[0]));
      checkEquations(result, result.solution);
      checkTrace(result);
    });
  }

  it('swaps a zero initial pivot and leaves the input unchanged', () => {
    const matrix = [
      ['0', '1'],
      ['1', '1'],
    ];
    const original = JSON.stringify(matrix);
    const result = solveGaussian(matrix, ['1', '3']);
    expect(result.classification).toBe('unique');
    if (result.classification !== 'unique') throw new Error('Expected unique');
    expect(strings(result.solution)).toEqual(['2', '1']);
    expect(result.steps.some((step) => step.kind === 'swap')).toBe(true);
    expect(JSON.stringify(matrix)).toBe(original);
    checkTrace(result);
  });

  it.each([
    {
      a: [
        ['1', '1'],
        ['2', '2'],
      ],
      b: ['2', '4'],
      p: ['2', '0'],
      d: [['-1', '1']],
      free: [1],
    },
    {
      a: [
        ['3', '4'],
        ['1.5', '2'],
      ],
      b: ['10', '5'],
      p: ['10/3', '0'],
      d: [['-4/3', '1']],
      free: [1],
    },
    {
      a: [
        ['0', '2', '4'],
        ['0', '0', '0'],
      ],
      b: ['6', '0'],
      p: ['0', '3', '0'],
      d: [
        ['1', '0', '0'],
        ['0', '-2', '1'],
      ],
      free: [0, 2],
    },
    {
      a: [['0', '0']],
      b: ['0'],
      p: ['0', '0'],
      d: [
        ['1', '0'],
        ['0', '1'],
      ],
      free: [0, 1],
    },
    {
      a: [['1', '2', '3']],
      b: ['4'],
      p: ['4', '0', '0'],
      d: [
        ['-2', '1', '0'],
        ['-3', '0', '1'],
      ],
      free: [1, 2],
    },
    {
      a: [
        ['1', '1', '1'],
        ['0', '1', '2'],
      ],
      b: ['4', '3'],
      p: ['1', '3', '0'],
      d: [['1', '-2', '1']],
      free: [2],
    },
  ])(
    'represents all solutions of an underdetermined system %#',
    ({ a, b, p, d, free }) => {
      const result = solveGaussian(a, b);
      expect(result.classification).toBe('infinite');
      if (result.classification !== 'infinite')
        throw new Error('Expected infinite');
      expect(strings(result.particular)).toEqual(p);
      expect(result.directions.map(strings)).toEqual(d);
      expect(result.freeColumns).toEqual(free);
      expect(result.rank + result.directions.length).toBe(a[0]!.length);
      checkEquations(result, result.particular);
      result.directions.forEach((direction) =>
        checkEquations(result, direction, true),
      );
      checkTrace(result);
    },
  );

  it.each([
    {
      a: [
        ['1', '1'],
        ['2', '2'],
      ],
      b: ['2', '5'],
    },
    { a: [['0']], b: ['1'] },
    { a: [['1'], ['1'], ['0']], b: ['1', '2', '3'] },
    {
      a: [
        ['0', '0'],
        ['0', '0'],
      ],
      b: ['1', '2'],
    },
  ])(
    'returns a contradictory row instead of a fabricated solution %#',
    ({ a, b }) => {
      const result = solveGaussian(a, b);
      expect(result.classification).toBe('inconsistent');
      if (result.classification !== 'inconsistent')
        throw new Error('Expected inconsistent');
      const row = result.echelon[result.contradictionRow]!;
      expect(
        row.slice(0, -1).every((value) => Rational.fromJSON(value).isZero()),
      ).toBe(true);
      expect(Rational.fromJSON(row.at(-1)!).isZero()).toBe(false);
      expect(result.augmentedRank).toBe(result.rank + 1);
      expect('solution' in result).toBe(false);
      checkTrace(result);
    },
  );

  it('handles redundant equations with a unique solution', () => {
    const result = solveGaussian(
      [
        ['1', '1'],
        ['2', '1'],
        ['3', '2'],
      ],
      ['3', '4', '7'],
    );
    expect(result.classification).toBe('unique');
    if (result.classification !== 'unique') throw new Error('Expected unique');
    expect(strings(result.solution)).toEqual(['1', '2']);
    checkEquations(result, result.solution);
    checkTrace(result);
  });

  it('keeps small decimal pivots nonzero and supports the 1x1 boundary', () => {
    const result = solveGaussian([['0.000000000001']], ['1']);
    expect(result.classification).toBe('unique');
    if (result.classification !== 'unique') throw new Error('Expected unique');
    expect(strings(result.solution)).toEqual(['1000000000000']);
    checkTrace(result);
  });

  it('solves deterministic integer systems up to 6x6 with independently planted solutions', () => {
    for (let n = 1; n <= 6; n++) {
      // A = I + J is invertible: eigenvalues 1 and n+1. All arithmetic here is integer Number arithmetic.
      const a = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 2 : 1)),
      );
      const expected = Array.from({ length: n }, (_, i) => 2 * i - 3);
      const b = a.map((row) =>
        row.reduce((sum, cell, j) => sum + cell * expected[j]!, 0),
      );
      const result = solveGaussian(
        a.map((row) => row.map(String)),
        b.map(String),
      );
      expect(result.classification).toBe('unique');
      if (result.classification !== 'unique')
        throw new Error('Expected unique');
      expect(strings(result.solution)).toEqual(expected.map(String));
      checkTrace(result);
    }
  });

  it('deeply freezes the trace and round-trips without bigint in JSON', () => {
    const result = solveGaussian(
      [
        ['1', '2', '3'],
        ['2', '4', '6'],
      ],
      ['4', '8'],
    );
    function checkFrozen(value: unknown) {
      if (value !== null && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(checkFrozen);
      }
    }
    checkFrozen(result);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    const saved = JSON.stringify(result);
    solveGaussian([['2']], ['3']);
    expect(JSON.stringify(result)).toBe(saved);
  });

  it('rejects invalid dimensions and zero denominators before producing steps', () => {
    expect(() => solveGaussian([['1'], ['2']], ['1'])).toThrowError(
      expect.objectContaining({ code: 'INVALID_DIMENSIONS' }),
    );
    expect(() => solveGaussian([['1/0']], ['1'])).toThrowError(
      expect.objectContaining({ code: 'DIVISION_BY_ZERO' }),
    );
  });
});
