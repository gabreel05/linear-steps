import type {
  DeterminantExpansion,
  DeterminantResult,
  SerializedMatrix,
} from '@linear-steps/contracts';

import { matrixTex, rationalTex } from './math-format';

export const determinantLabels = {
  formula: 'Fórmula direta (ordens 1 e 2)',
  sarrus: 'Sarrus (ordem 3)',
  laplace: 'Laplace (até ordem 4)',
  triangular: 'Triangularização (até ordem 6)',
};
type Frame = {
  title: string;
  matrix: SerializedMatrix;
  tex: string;
  active: (row: number, column: number) => boolean;
  pivot?: number;
};
export function determinantFrames(result: DeterminantResult): Frame[] {
  const frames: Frame[] = [];
  const expansion = (proof: DeterminantExpansion, name: string) => {
    if (proof.kind === 'laplace') {
      frames.push({
        title: `${name} · ${proof.axis === 'row' ? 'linha' : 'coluna'} ${proof.index + 1}`,
        matrix: proof.matrix,
        active: (r, c) => (proof.axis === 'row' ? r : c) === proof.index,
        tex: `\\det${matrixTex(proof.matrix)}=${proof.terms.map((t) => `(${rationalTex(t.coefficient)})\\cdot(-1)^{${t.row + 1}+${t.column + 1}}\\cdot(${rationalTex(t.minor.value)})`).join('+')}=${rationalTex(proof.value)}`,
      });
      for (const t of proof.terms)
        expansion(t.minor, `${name} → M${t.row + 1},${t.column + 1}`);
    } else {
      for (const [i, t] of proof.terms.entries())
        frames.push({
          title: `${name} · produto ${i + 1}`,
          matrix: proof.matrix,
          active: (r, c) =>
            t.cells.some((cell) => cell.row === r && cell.column === c),
          tex: `${t.sign === -1 ? '-' : ''}\\left(${t.cells.map((cell) => `(${rationalTex(proof.matrix[cell.row]![cell.column]!)})`).join('\\cdot')}\\right)=${t.sign === -1 ? '-' : ''}(${rationalTex(t.product)})`,
        });
      frames.push({
        title: `${name} · soma dos termos`,
        matrix: proof.matrix,
        active: () => false,
        tex: `\\det${matrixTex(proof.matrix)}=${proof.terms.map((t) => `${t.sign === -1 ? '-' : '+'}(${rationalTex(t.product)})`).join('')}=${rationalTex(proof.value)}`,
      });
    }
  };
  const proof = result.proof;
  if (proof.kind === 'triangular') {
    for (const step of proof.steps)
      frames.push({
        title:
          step.kind === 'initial'
            ? 'Matriz inicial'
            : step.kind === 'swap'
              ? 'Troca de linhas'
              : 'Eliminação abaixo do pivô',
        matrix: step.matrix,
        active: (r) =>
          step.kind === 'swap'
            ? r === step.first || r === step.second
            : step.kind === 'add-row' && r === step.target,
        ...(step.kind === 'add-row' ? { pivot: step.source } : {}),
        tex:
          (step.kind === 'initial'
            ? ''
            : step.kind === 'swap'
              ? `L_{${step.first + 1}}\\leftrightarrow L_{${step.second + 1}}\\qquad `
              : `L_{${step.target + 1}}\\leftarrow L_{${step.target + 1}}+(${rationalTex(step.factor)})L_{${step.source + 1}}\\qquad `) +
          `\\det(A)=${step.correction}\\cdot\\det${matrixTex(step.matrix)}`,
      });
    frames.push({
      title: 'Produto da diagonal e correção de sinal',
      matrix: proof.triangular,
      active: (r, c) => r === c,
      tex: `\\det(A)=${proof.correction}\\cdot${proof.triangular.map((row, i) => `(${rationalTex(row[i]!)})`).join('\\cdot')}=${rationalTex(result.value)}`,
    });
  } else expansion(proof, 'A');
  return frames;
}
