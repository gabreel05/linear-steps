// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { solveCramer, solveByInverse } from '@linear-steps/math-core';
import { App } from './App';
import { insertRecord, reopen } from './history/records';
afterEach(cleanup);
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const solve = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Resolver passo a passo' }),
  );
it.each(['cramer', 'inverse'])(
  'solves with %s, navigates steps and invalidates on method changes',
  (method) => {
    render(<App />);
    change('Método', method);
    solve();
    expect(
      screen.getByRole('heading', {
        name:
          method === 'cramer'
            ? 'Sistema por Cramer'
            : 'Sistema pela matriz inversa',
      }),
    ).toBeTruthy();
    change('Etapa do método', '1');
    expect(
      screen.getByRole('heading', {
        name:
          method === 'cramer'
            ? 'Substituição da coluna 1 por b'
            : 'Produto da linha 1 de A⁻¹ por b',
      }),
    ).toBeTruthy();
    change('Etapa do método', '2');
    change('Etapa do método', '0');
    expect(document.querySelector('.katex-error')).toBeNull();
    change('Método', 'gauss');
    expect(screen.queryByLabelText('Etapa do método')).toBeNull();
    solve();
    expect(
      screen.getByRole('heading', { name: 'Solução única (SPD)' }),
    ).toBeTruthy();
  },
);
it.each(['cramer', 'inverse'])(
  'explains singularity with %s and switches only after user choice',
  (method) => {
    render(<App />);
    change('Carregar exemplo', '1');
    change('Método', method);
    solve();
    expect(screen.getByText(/Este método não se aplica/)).toBeTruthy();
    expect((screen.getByLabelText('Método') as HTMLSelectElement).value).toBe(
      method,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Gauss' }));
    expect(screen.queryByText(/Este método não se aplica/)).toBeNull();
    solve();
    expect(
      screen.getByRole('heading', { name: 'Infinitas soluções (SPI)' }),
    ).toBeTruthy();
  },
);
it.each([solveCramer, solveByInverse])(
  'restores exact input and rejects altered solutions and method metadata',
  (solver) => {
    for (const b of [
      ['1', '0'],
      ['2', '4'],
    ]) {
      const a =
        b[0] === '1'
          ? [
              ['2', '1'],
              ['0', '3'],
            ]
          : [
              ['1', '1'],
              ['2', '2'],
            ];
      const result = solver(a, b);
      const row = {
        ...insertRecord(
          { operation: 'system', result },
          '00000000-0000-4000-8000-000000000010',
          'Método',
        ),
        created_at: '2026-10-10T12:00:00Z',
      };
      const saved = reopen(row);
      expect(saved.a).toEqual(a);
      expect(saved.b).toEqual(b);
      expect(saved.result).toEqual(result);
      expect(() => reopen({ ...row, method: 'gauss' })).toThrow();
      expect(() =>
        reopen({ ...row, payload: { ...result, status: 'bad' } }),
      ).toThrow();
      expect(() =>
        reopen({ ...row, payload: { ...result, solution: [] } }),
      ).toThrow();
    }
  },
);
