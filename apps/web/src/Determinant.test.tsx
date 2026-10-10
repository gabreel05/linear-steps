// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import katex from 'katex';
import { determinant } from '@linear-steps/math-core';
import { App } from './App';
import { DeterminantSteps } from './Determinant';
import { determinantFrames } from './determinant-steps';
import { insertRecord, reopen } from './history/records';
afterEach(cleanup);
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const solve = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Resolver passo a passo' }),
  );
const a = [
  ['3', '1', '-2'],
  ['-5', '4', '-6'],
  ['0', '2', '7'],
];
it.each(['formula', 'sarrus', 'laplace', 'triangular'] as const)(
  'renders %s, valid TeX and exact history',
  (method) => {
    const input =
      method === 'formula'
        ? [
            ['1/2', '0'],
            ['0', '3'],
          ]
        : a;
    const result = determinant(
      input,
      method === 'laplace' ? { method, axis: 'column', index: 1 } : { method },
    );
    for (const frame of determinantFrames(result))
      expect(() =>
        katex.renderToString(frame.tex, { throwOnError: true }),
      ).not.toThrow();
    render(<DeterminantSteps result={result} />);
    expect(
      screen
        .getByRole('button', { name: 'Etapa anterior' })
        .hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima etapa' }));
    expect(screen.getByText(/Etapa 2 de/)).toBeTruthy();
    const row = insertRecord(
      { operation: 'determinant', result },
      '00000000-0000-4000-8000-000000000010',
      'Meu determinante',
    );
    const saved = { ...row, created_at: '2026-10-10T12:00:00Z' };
    const restored = reopen(saved);
    expect(restored.result).toEqual(result);
    expect(restored.determinantOptions).toEqual(result.options);
    expect(() =>
      reopen({
        ...saved,
        payload: { ...result, value: { numerator: '999', denominator: '1' } },
      }),
    ).toThrow();
    expect(() => reopen({ ...saved, method: 'gauss' })).toThrow();
    expect(() =>
      reopen({
        ...saved,
        payload: { ...result, proof: { ...result.proof, kind: 'bad' } },
      }),
    ).toThrow();
  },
);
it('invalidates results on method, axis, index and matrix changes, rejecting incompatible choices', () => {
  render(<App />);
  change('Operação', 'determinant');
  change('Carregar exemplo', '0');
  solve();
  expect(screen.getByRole('heading', { name: 'Determinante' })).toBeTruthy();
  change('Método', 'formula');
  expect(screen.queryByRole('heading', { name: 'Determinante' })).toBeNull();
  solve();
  expect(screen.getByRole('alert').textContent).toContain('ordens 1 e 2');
  change('Método', 'laplace');
  change('Expandir por', 'column');
  change('Índice da expansão', '1');
  solve();
  expect(screen.getByText('A · coluna 2')).toBeTruthy();
  change('Índice da expansão', '5');
  expect(screen.queryByRole('heading', { name: 'Determinante' })).toBeNull();
  solve();
  expect(screen.getByRole('alert').textContent).toContain('existente');
  change('Índice da expansão', '0');
  solve();
  change('Linha 1, coluna 1', '1/2');
  expect(screen.queryByRole('heading', { name: 'Determinante' })).toBeNull();
  change('Colunas', '2');
  solve();
  expect(screen.getByRole('alert').textContent).toContain('quadrada');
});
it('highlights the pivot and changed row and handles singular and scalar matrices', () => {
  const result = determinant(
    [
      ['1', '2'],
      ['3', '4'],
    ],
    { method: 'triangular' },
  );
  render(<DeterminantSteps result={result} />);
  fireEvent.click(screen.getByRole('button', { name: 'Próxima etapa' }));
  expect(screen.getByLabelText('Pivô').className).toBe('pivot-cell');
  expect(document.querySelectorAll('.matrix-active')).toHaveLength(2);
  for (const matrix of [
    [['0']],
    [
      ['1', '2'],
      ['2', '4'],
    ],
  ])
    for (const frame of determinantFrames(
      determinant(matrix, { method: 'triangular' }),
    ))
      expect(() =>
        katex.renderToString(frame.tex, { throwOnError: true }),
      ).not.toThrow();
});
