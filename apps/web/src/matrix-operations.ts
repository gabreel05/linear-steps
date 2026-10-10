import {
  addMatrices,
  subtractMatrices,
  multiplyMatrices,
  scaleMatrix,
  transposeMatrix,
} from '@linear-steps/math-core';
import type { MatrixCellStep } from '@linear-steps/contracts';
import { rationalTex } from './math-format';

export const basicLabels = {
  add: 'Soma de matrizes',
  subtract: 'Subtração de matrizes',
  scale: 'Multiplicação por escalar',
  multiply: 'Produto matricial',
  transpose: 'Transposta',
};
export type BasicOperation = keyof typeof basicLabels;
export const isBasic = (value: string): value is BasicOperation =>
  Object.hasOwn(basicLabels, value);
export function calculateBasic(
  operation: BasicOperation,
  a: string[][],
  b: string[][],
  scalar: string,
) {
  switch (operation) {
    case 'add':
      return addMatrices(a, b);
    case 'subtract':
      return subtractMatrices(a, b);
    case 'multiply':
      return multiplyMatrices(a, b);
    case 'scale':
      return scaleMatrix(a, scalar);
    case 'transpose':
      return transposeMatrix(a);
  }
}
export function cellTex(step: MatrixCellStep): string {
  const wrap = (v: Parameters<typeof rationalTex>[0]) =>
    `\\left(${rationalTex(v)}\\right)`;
  const lhs = `c_{${step.row + 1},${step.column + 1}}`;
  let expression: string;
  switch (step.kind) {
    case 'add':
      expression = `${wrap(step.left)}+${wrap(step.right)}`;
      break;
    case 'subtract':
      expression = `${wrap(step.left)}-${wrap(step.right)}`;
      break;
    case 'scale':
      expression = `${wrap(step.scalar)}\\cdot${wrap(step.operand)}`;
      break;
    case 'multiply':
      expression = step.terms
        .map((t) => `${wrap(t.left)}\\cdot${wrap(t.right)}`)
        .join('+');
      break;
    case 'transpose':
      expression = `a_{${step.sourceRow + 1},${step.sourceColumn + 1}}`;
      break;
  }
  return `${lhs}=${expression}=${rationalTex(step.value)}`;
}
