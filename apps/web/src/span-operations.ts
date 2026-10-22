import type {
  LinearCombinationResult,
  SpanBasisResult,
} from '@linear-steps/contracts';
import { analyzeSpan, solveLinearCombination } from '@linear-steps/math-core';
import { matrixTex, rationalTex } from './math-format';

export type SpanResult = LinearCombinationResult | SpanBasisResult;
export type SpanFormInput = {
  operation: 'linear-combination' | 'span-basis';
  vectors: string[][];
  target: string[];
};
export const spanLabels = {
  'linear-combination': 'Combinação linear',
  'span-basis': 'LI/LD e bases',
};
export function calculateSpan(input: SpanFormInput): SpanResult {
  return input.operation === 'span-basis'
    ? analyzeSpan(input.vectors)
    : solveLinearCombination(input.vectors, input.target);
}
export function spanDisplay(result: SpanResult) {
  const vector = (v: (typeof result.vectors)[number]) =>
    matrixTex(v.map((x) => [x]));
  const setup = `A=${matrixTex(result.system.input.coefficients)},\\quad Ax=${vector(result.system.input.constants)}`;
  if (result.operation === 'linear-combination') {
    return {
      title: result.belongsToSpan
        ? 'O vetor pertence ao espaço gerado'
        : 'O vetor não pertence ao espaço gerado',
      setup,
      formulas: [
        `b${result.belongsToSpan ? '\\in' : '\\notin'}\\operatorname{span}(v_1,\\ldots,v_{${result.vectors.length}})`,
      ],
    };
  }
  const basis = result.basis.length
    ? `\\left\\{${result.basis.map(vector).join(',')}\\right\\}`
    : '\\varnothing';
  const formulas = [
    `\\dim\\operatorname{span}(v_1,\\ldots,v_{${result.vectors.length}})=${result.dimension}`,
    `\\mathcal{B}=${basis}`,
  ];
  if (!result.independent)
    formulas.push(
      `${result.dependenceRelation.map((c, i) => `\\left(${rationalTex(c)}\\right)v_{${i + 1}}`).join('+')}=0`,
    );
  return {
    title: result.independent
      ? 'Vetores linearmente independentes (LI)'
      : 'Vetores linearmente dependentes (LD)',
    setup,
    formulas,
  };
}
