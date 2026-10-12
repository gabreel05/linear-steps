// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { invertByAdjugate, invertMatrix } from '@linear-steps/math-core';
import { App } from './App';
import { AdjugateSteps } from './Adjugate';
import { insertRecord, reopen } from './history/records';
afterEach(cleanup);
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const solve = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Resolver passo a passo' }),
  );
it('navigates cofactors, transpose and final formula; invalidates method changes', () => {
  render(<App />);
  change('Operação', 'inverse');
  change('Carregar exemplo', '1');
  change('Método', 'adjugate');
  solve();
  expect(
    screen.getByRole('heading', { name: 'Inversa por adjunta' }),
  ).toBeTruthy();
  for (let i = 0; i < 12; i++) {
    change('Etapa da adjunta', String(i));
    expect(document.querySelector('.katex-error')).toBeNull();
  }
  expect(screen.getByRole('heading', { name: 'Conclusão' })).toBeTruthy();
  change('Método', 'gauss-jordan');
  expect(screen.queryByLabelText('Etapa da adjunta')).toBeNull();
  solve();
  expect(screen.getByRole('heading', { name: 'Matriz inversa' })).toBeTruthy();
});
it('explains the empty minor and singularity without division by zero', () => {
  render(<AdjugateSteps result={invertByAdjugate([['0']])} />);
  change('Etapa da adjunta', '1');
  expect(screen.getByText(/menor é vazio/)).toBeTruthy();
  change('Etapa da adjunta', '3');
  expect(screen.getByText(/Matriz singular/)).toBeTruthy();
  expect(document.querySelector('.katex-error')).toBeNull();
});
it('rejects order five and offers an explicit method change', () => {
  render(<App />);
  change('Operação', 'inverse');
  change('Método', 'adjugate');
  change('Linhas', '5');
  change('Colunas', '5');
  solve();
  expect(screen.getByRole('alert').textContent).toContain('ordem 4');
  fireEvent.click(
    screen.getByRole('button', { name: 'Selecionar Gauss-Jordan' }),
  );
  expect((screen.getByLabelText('Método') as HTMLSelectElement).value).toBe(
    'gauss-jordan',
  );
  expect(screen.queryByRole('alert')).toBeNull();
});
it.each([invertByAdjugate, invertMatrix])(
  'restores inverse methods and rejects tampered payloads',
  (solver) => {
    for (const a of [[['2']], [['0']]]) {
      const result = solver(a);
      const row = {
        ...insertRecord(
          { operation: 'inverse', result },
          '00000000-0000-4000-8000-000000000010',
          'Inversa',
        ),
        created_at: '2026-10-11T12:00:00Z',
      };
      expect(reopen(row).result).toEqual(result);
      expect(reopen(row).a).toEqual(a);
      expect(() =>
        reopen({ ...row, payload: { ...result, input: [] } }),
      ).toThrow();
      expect(() => reopen({ ...row, algorithm_version: 'bad' })).toThrow();
      if (result.method === 'adjugate')
        expect(() =>
          reopen({ ...row, payload: { ...result, cofactors: [] } }),
        ).toThrow();
    }
  },
);
