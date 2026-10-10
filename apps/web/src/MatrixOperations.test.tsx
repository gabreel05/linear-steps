// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import katex from 'katex';
import { App } from './App';
import { basicLabels, calculateBasic, cellTex } from './matrix-operations';
import { insertRecord, reopen } from './history/records';

afterEach(cleanup);
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const solve = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Resolver passo a passo' }),
  );

it.each(Object.entries(basicLabels))(
  'calculates %s, navigates steps, and clears stale results on input changes',
  (operation, title) => {
    render(<App />);
    change('Operação', operation);
    solve();
    expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    expect(screen.getByText(/Etapa 1 de/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima etapa' }));
    expect(screen.getByText(/Etapa 2 de/)).toBeTruthy();
    change('Linha 1, coluna 1', '1/2');
    expect(screen.queryByRole('heading', { name: title })).toBeNull();
    solve();
    expect(screen.getByText(/Etapa 1 de/)).toBeTruthy();
  },
);

it('reports incompatible and invalid B inputs and clears results when B changes', () => {
  render(<App />);
  change('Operação', 'multiply');
  solve();
  change('Linhas de B', '2');
  expect(screen.queryByText(/Etapa 1 de/)).toBeNull();
  solve();
  expect(screen.getByRole('alert').textContent).toContain('colunas de A');
  change('Linhas de B', '3');
  change('B, linha 1, coluna 1', 'a');
  solve();
  expect(screen.getByRole('alert')).toBeTruthy();
  change('B, linha 1, coluna 1', '1/3');
  solve();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('invalidates a scalar calculation and rejects division by zero', () => {
  render(<App />);
  change('Operação', 'scale');
  solve();
  change('Escalar', '1/0');
  expect(screen.queryByText(/Etapa 1 de/)).toBeNull();
  solve();
  expect(screen.getByRole('alert').textContent).toContain('zero');
});

it('highlights a row of A and column of B for rectangular products', () => {
  const { container } = render(<App />);
  change('Operação', 'multiply');
  change('Linhas', '2');
  change('Colunas de B', '1');
  solve();
  expect(container.querySelectorAll('.matrix-active')).toHaveLength(6);
  expect(screen.getByText(/Etapa 1 de 2/)).toBeTruthy();
});

it.each(Object.keys(basicLabels) as (keyof typeof basicLabels)[])(
  'round trips %s with exact inputs and rejects tampered snapshots',
  (operation) => {
    const a = [
      ['-1/3', '0.2'],
      ['0', '2'],
    ];
    const b = [
      ['1', '2'],
      ['3', '4'],
    ];
    const result = calculateBasic(operation, a, b, '-2/3');
    const row = {
      ...insertRecord(
        { operation, result },
        '00000000-0000-4000-8000-000000000001',
        'Teste',
      ),
      created_at: '2026-10-10T00:00:00Z',
    };
    const opened = reopen(JSON.parse(JSON.stringify(row)));
    expect(opened.result).toEqual(result);
    expect(opened.a).toEqual([
      ['-1/3', '1/5'],
      ['0', '2'],
    ]);
    if (operation === 'scale') expect(opened.scalar).toBe('-2/3');
    if ('right' in result.input) expect(opened.right).toEqual(b);
    for (const step of result.steps)
      expect(() =>
        katex.renderToString(cellTex(step), { throwOnError: true }),
      ).not.toThrow();
    const corrupt = {
      ...row,
      payload: {
        ...result,
        steps: result.steps.map((step, i) =>
          i === 0
            ? { ...step, value: { numerator: '99', denominator: '1' } }
            : step,
        ),
      },
    };
    expect(() => reopen(corrupt)).toThrow();
    expect(() => reopen({ ...row, operation: 'inverse' })).toThrow();
    expect(() =>
      reopen({ ...row, algorithm_version: 'matrix-operations-2' }),
    ).toThrow();
  },
);
