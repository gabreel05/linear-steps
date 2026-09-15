import { describe, expect, it } from 'vitest';
import katex from 'katex';
import {
  parseScalar,
  solveGaussian,
  reduceMatrix,
  invertMatrix,
} from '@linear-steps/math-core';
import {
  decimalText,
  rationalTex,
  solutionTex,
  stepTex,
  resultTex,
} from './math-format';

describe('math presentation', () => {
  it.each([
    {
      result: reduceMatrix([
        ['1', '2', '3'],
        ['0', '2', '4'],
      ]),
    },
    {
      result: invertMatrix([
        ['2', '1'],
        ['0', '3'],
      ]),
    },
    {
      result: invertMatrix([
        ['1', '2'],
        ['2', '4'],
      ]),
    },
  ])(
    'renders Gauss-Jordan results and every operation without TeX errors %#',
    ({ result }) => {
      for (const formula of [
        resultTex(result),
        ...result.steps.map((step) => stepTex(step, result)),
      ]) {
        if (formula)
          expect(() =>
            katex.renderToString(formula, {
              throwOnError: true,
              strict: 'error',
              trust: false,
            }),
          ).not.toThrow();
      }
    },
  );
  it.each([
    ['1/3', '0,333333'],
    ['-2/3', '-0,666667'],
    ['1/2000000', '0,000001'],
    ['-1/100000000', '0'],
    ['99999999999999999999999999999999', '99999999999999999999999999999999'],
  ])('rounds %s without Number overflow', (input, expected) => {
    expect(decimalText(parseScalar(input).toJSON())).toBe(expected);
  });
  it('renders a signed fraction', () => {
    expect(rationalTex(parseScalar('-2/3').toJSON())).toBe('-\\frac{2}{3}');
  });
  it.each([
    {
      a: [
        ['0', '1'],
        ['1', '1'],
      ],
      b: ['1', '3'],
    },
    {
      a: [
        ['1', '1', '1'],
        ['0', '1', '2'],
      ],
      b: ['4', '3'],
    },
    { a: [['0', '0', '0']], b: ['0'] },
    { a: [['1'], ['1']], b: ['1', '2'] },
  ])('generates valid KaTeX for all step kinds %#', ({ a, b }) => {
    const result = solveGaussian(a, b);
    const formulas = [
      solutionTex(result),
      ...result.steps
        .map((step) => stepTex(step, result))
        .filter((tex) => tex !== null),
    ];
    formulas.forEach((tex) =>
      expect(() =>
        katex.renderToString(tex, {
          throwOnError: true,
          strict: 'error',
          trust: false,
        }),
      ).not.toThrow(),
    );
  });
});
