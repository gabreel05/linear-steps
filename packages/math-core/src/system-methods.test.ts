import { expect, it } from 'vitest';
import fixtures from '../../../tests/fixtures/reference-cases.json';
import {
  solveCramer,
  solveByInverse,
  parseLinearSystem,
  Rational,
} from './index';
const solvers = [solveCramer, solveByInverse];
function frozen(v: unknown) {
  if (v && typeof v === 'object') {
    expect(Object.isFrozen(v)).toBe(true);
    Object.values(v).forEach(frozen);
  }
}
it.each(fixtures.cases.filter((c) => c.operation === 'solve'))(
  'solves $id by both methods and satisfies original equations',
  (c) => {
    const a = c.input.matrix!,
      b = c.input.rhs!.map((row) => row[0]!);
    for (const solve of solvers) {
      const r = solve(a, b);
      expect(r.status).toBe('unique');
      if (r.status !== 'unique') throw Error('status');
      expect(r.solution.map((v) => [Rational.fromJSON(v).toString()])).toEqual(
        c.expected.solution,
      );
      const input = parseLinearSystem(a, b);
      input.coefficients.forEach((row, i) =>
        expect(
          row
            .reduce(
              (sum, v, j) =>
                sum.add(v.multiply(Rational.fromJSON(r.solution[j]!))),
              Rational.fromIntegers(0n),
            )
            .toJSON(),
        ).toEqual(input.constants[i]!.toJSON()),
      );
      frozen(r);
      expect(JSON.parse(JSON.stringify(r))).toEqual(r);
      if (r.method === 'cramer')
        for (const step of r.steps) {
          expect(step.replaced).toEqual(
            r.input.coefficients.map((row, i) =>
              row.map((v, j) => (j === step.column ? r.input.constants[i] : v)),
            ),
          );
          expect(
            Rational.fromJSON(step.determinant.value)
              .divide(Rational.fromJSON(step.divisor))
              .toJSON(),
          ).toEqual(step.value);
        }
      else
        for (const step of r.steps) {
          let sum = Rational.fromIntegers(0n);
          for (const t of step.terms) {
            expect(t.constant).toEqual(r.input.constants[t.column]);
            if (r.inverse.classification !== 'invertible')
              throw Error('inverse');
            expect(t.coefficient).toEqual(
              r.inverse.inverse[step.row]![t.column],
            );
            const p = Rational.fromJSON(t.coefficient).multiply(
              Rational.fromJSON(t.constant),
            );
            expect(t.product).toEqual(p.toJSON());
            sum = sum.add(p);
          }
          expect(step.value).toEqual(sum.toJSON());
        }
    }
  },
);
it.each([
  ['2', '4'],
  ['2', '5'],
  ['0', '0'],
])('does not classify singular systems for rhs %j', (...b) => {
  for (const solve of solvers) {
    const r = solve(
      [
        ['1', '1'],
        ['2', '2'],
      ],
      b,
    );
    expect(r.status).toBe('not-applicable');
    expect(r).not.toHaveProperty('solution');
    expect(r).not.toHaveProperty('classification');
    frozen(r);
  }
});
it.each([1, 2, 3, 4, 5, 6])(
  'recovers a manufactured exact solution of order %i',
  (n) => {
    const a = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        String(i === j ? 10 + i : ((i + j) % 3) - 1),
      ),
    );
    const x = Array.from({ length: n }, (_, i) => BigInt(i - 2));
    const b = a.map((row) =>
      String(row.reduce((s, v, j) => s + BigInt(v) * x[j]!, 0n)),
    );
    for (const solve of n <= 4 ? solvers : [solveByInverse]) {
      const r = solve(a, b);
      if (r.status !== 'unique') throw Error('status');
      expect(r.solution.map((v) => Rational.fromJSON(v).toString())).toEqual(
        x.map(String),
      );
    }
  },
);
it('handles fractions, pivot swaps, scalar systems and input precision boundaries', () => {
  for (const solve of solvers) {
    const r = solve(
      [
        ['0', '1/2'],
        ['-2', '3'],
      ],
      ['1/3', '0'],
    );
    if (r.status !== 'unique') throw Error('status');
    expect(r.solution.map((v) => Rational.fromJSON(v).toString())).toEqual([
      '1',
      '2/3',
    ]);
    const large = '12345678901234567890123456789012.123456789012';
    const single = solve([[large]], [large]);
    if (single.status !== 'unique') throw Error('status');
    expect(single.solution).toEqual([Rational.fromIntegers(1n).toJSON()]);
    const tiny = solve(
      [['1/99999999999999999999999999999999']],
      ['99999999999999999999999999999999'],
    );
    if (tiny.status !== 'unique') throw Error('status');
    expect(tiny.solution[0]!.numerator).toBe(
      String(99999999999999999999999999999999n ** 2n),
    );
  }
});
it('rejects dimensions, limits and invalid values without mutating input', () => {
  for (const solve of solvers) {
    for (const [a, b] of [
      [[['1', '2']], ['1']],
      [[['1']], []],
      [[['a']], ['1']],
      [[['1']], ['1/0']],
    ])
      expect(() => solve(a, b)).toThrow();
    const a = [['1']],
      b = ['2'];
    solve(a, b);
    expect(a).toEqual([['1']]);
    expect(b).toEqual(['2']);
    expect(Object.isFrozen(a)).toBe(false);
  }
  const a = Array.from({ length: 5 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => (i === j ? '1' : '0')),
  );
  expect(() => solveCramer(a, a[0])).toThrow(/ordem 4/);
});
