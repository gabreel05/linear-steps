import type {
  DotProof,
  ExactReal,
  VectorResult,
} from '@linear-steps/contracts';
import {
  addVectors,
  subtractVectors,
  scaleVector,
  vectorBetweenPoints,
  dotProduct,
  vectorNorm,
  normalizeVector,
  vectorAngle,
  projectVector,
} from '@linear-steps/math-core';
import { matrixTex, rationalTex } from './math-format';
export const vectorLabels = {
  add: 'Soma de vetores',
  subtract: 'Subtração de vetores',
  scale: 'Vetor por escalar',
  'between-points': 'Vetor entre dois pontos',
  dot: 'Produto escalar',
  norm: 'Norma',
  normalize: 'Normalização',
  angle: 'Ângulo entre vetores',
  projection: 'Projeção e componente ortogonal',
};
export type VectorOperation = keyof typeof vectorLabels;
export type VectorFormInput = {
  operation: VectorOperation;
  left: string[];
  right: string[];
  scalar: string;
};
export const isVectorOperation = (value: unknown): value is VectorOperation =>
  typeof value === 'string' && Object.hasOwn(vectorLabels, value);
export function calculateVector(input: VectorFormInput): VectorResult {
  const { operation, left, right, scalar } = input;
  switch (operation) {
    case 'add':
      return addVectors(left, right);
    case 'subtract':
      return subtractVectors(left, right);
    case 'scale':
      return scaleVector(left, scalar);
    case 'between-points':
      return vectorBetweenPoints(left, right);
    case 'dot':
      return dotProduct(left, right);
    case 'norm':
      return vectorNorm(left);
    case 'normalize':
      return normalizeVector(left);
    case 'angle':
      return vectorAngle(left, right);
    case 'projection':
      return projectVector(left, right);
  }
}
export function exactRealTex(value: ExactReal): string {
  if (value.kind === 'rational') return rationalTex(value.value);
  const root = `\\sqrt{${rationalTex(value.radicand)}}`;
  return value.kind === 'sqrt'
    ? root
    : `\\frac{${rationalTex(value.numerator)}}{${root}}`;
}
const exactVectorTex = (v: readonly ExactReal[]) =>
  `\\begin{pmatrix}${v.map(exactRealTex).join('\\\\')}\\end{pmatrix}`;
export type VectorDisplayStep = { title: string; tex: string };
function dotSteps(
  proof: DotProof,
  title: string,
  symbol: string,
): VectorDisplayStep[] {
  return [
    ...proof.terms.map((t) => ({
      title: `${title} · componente ${t.index + 1}`,
      tex: `(${rationalTex(t.left)})\\cdot(${rationalTex(t.right)})=${rationalTex(t.product)},\\quad S_{${t.index + 1}}=${rationalTex(t.partialSum)}`,
    })),
    {
      title,
      tex: `${symbol}=${proof.terms.map((t) => `(${rationalTex(t.left)})\\cdot(${rationalTex(t.right)})`).join('+')}=${rationalTex(proof.value)}`,
    },
  ];
}
export function vectorDisplay(result: VectorResult): {
  summary: string;
  notice?: string;
  steps: VectorDisplayStep[];
} {
  if ('steps' in result && 'result' in result)
    return {
      summary: `w=${matrixTex(result.result.map((v) => [v]))}`,
      steps: result.steps.map((s) => ({
        title: `Componente ${s.index + 1}`,
        tex: `w_{${s.index + 1}}=(${rationalTex(s.left)})${s.operator === '*' ? '\\cdot' : s.operator}(${rationalTex(s.right)})=${rationalTex(s.value)}`,
      })),
    };
  if ('proof' in result)
    return {
      summary: `u\\cdot v=${rationalTex(result.proof.value)}`,
      notice: result.orthogonal
        ? 'Os vetores são ortogonais: o produto escalar é zero.'
        : 'Os vetores não são ortogonais.',
      steps: dotSteps(result.proof, 'Produto escalar', 'u\\cdot v'),
    };
  if ('squaredNorm' in result) {
    const steps = dotSteps(
      result.squaredNorm,
      'Soma dos quadrados',
      '\\lVert u\\rVert^2',
    );
    const norm = `\\lVert u\\rVert=\\sqrt{${rationalTex(result.squaredNorm.value)}}`;
    steps.push({ title: 'Norma', tex: norm });
    if (!('status' in result))
      return {
        summary: `\\lVert u\\rVert=${exactRealTex(result.result)}`,
        steps,
      };
    if (result.status === 'undefined')
      return {
        summary: norm,
        notice: 'Normalização indefinida: o vetor zero não possui direção.',
        steps,
      };
    steps.push(
      ...result.result.map((v, i) => ({
        title: `Normalizar componente ${i + 1}`,
        tex: `\\widehat u_{${i + 1}}=\\frac{${rationalTex(result.input.vector[i]!)}}{\\sqrt{${rationalTex(result.squaredNorm.value)}}}=${exactRealTex(v)}`,
      })),
    );
    return { summary: `\\widehat u=${exactVectorTex(result.result)}`, steps };
  }
  if ('squaredNormLeft' in result) {
    const steps = [
      ...dotSteps(result.dot, 'Produto escalar', 'u\\cdot v'),
      ...dotSteps(
        result.squaredNormLeft,
        'Norma de u ao quadrado',
        '\\lVert u\\rVert^2',
      ),
      ...dotSteps(
        result.squaredNormRight,
        'Norma de v ao quadrado',
        '\\lVert v\\rVert^2',
      ),
    ];
    if (result.status === 'undefined')
      return {
        summary: '',
        notice: 'Ângulo indefinido: pelo menos um dos vetores é zero.',
        steps,
      };
    const summary = `\\theta=\\arccos\\left(${exactRealTex(result.result.argument)}\\right)\\approx ${result.approximation.value.toFixed(6)}^{\\circ}`;
    steps.push(
      {
        title: 'Ângulo',
        tex: `\\cos\\theta=\\frac{u\\cdot v}{\\lVert u\\rVert\\lVert v\\rVert}=${exactRealTex(result.result.argument)}`,
      },
      { title: 'Resultado em graus', tex: summary },
    );
    return { summary, steps };
  }
  const steps = dotSteps(result.dot, 'Produto escalar', 'u\\cdot v').concat(
    dotSteps(
      result.squaredNormDirection,
      'Norma da direção ao quadrado',
      'v\\cdot v',
    ),
  );
  if (result.status === 'undefined')
    return {
      summary: '',
      notice: 'Projeção indefinida: a direção v não pode ser o vetor zero.',
      steps,
    };
  steps.push({
    title: 'Fator da projeção',
    tex: `\\alpha=\\frac{u\\cdot v}{v\\cdot v}=${rationalTex(result.factor)}`,
  });
  steps.push(
    ...result.steps.map((s) => ({
      title: `Projeção e resíduo · componente ${s.index + 1}`,
      tex: `p_{${s.index + 1}}=(${rationalTex(result.factor)})(${rationalTex(s.direction)})=${rationalTex(s.projected)},\\quad r_{${s.index + 1}}=(${rationalTex(s.source)})-(${rationalTex(s.projected)})=${rationalTex(s.residual)}`,
    })),
  );
  steps.push(
    ...dotSteps(
      result.orthogonality,
      'Verificação de ortogonalidade',
      'r\\cdot v',
    ),
    ...dotSteps(
      result.squaredDistance,
      'Distância ao quadrado',
      '\\lVert r\\rVert^2',
    ),
    {
      title: 'Distância à reta pela origem',
      tex: `d=\\lVert r\\rVert=${exactRealTex(result.distance)}`,
    },
  );
  return {
    summary: `p=\\operatorname{proj}_v(u)=${matrixTex(result.projection.map((v) => [v]))},\\quad r=u-p=${matrixTex(result.residual.map((v) => [v]))}`,
    steps,
  };
}
