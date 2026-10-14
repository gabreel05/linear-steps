// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import katex from 'katex';
import { App } from './App';
import { VectorWorkspace } from './Vectors';
import {
  calculateVector,
  vectorDisplay,
  vectorLabels,
  type VectorOperation,
} from './vector-operations';
import { insertRecord, reopen } from './history/records';
afterEach(cleanup);
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const solve = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Resolver passo a passo' }),
  );
it.each(Object.keys(vectorLabels) as VectorOperation[])(
  'renders %s steps and restores a validated snapshot',
  (operation) => {
    const input = {
      operation,
      left: ['1', '2', '2'],
      right: ['1', '1', '0'],
      scalar: '2/3',
    };
    const result = calculateVector(input);
    for (const tex of [
      vectorDisplay(result).summary,
      ...vectorDisplay(result).steps.map((s) => s.tex),
    ])
      expect(() =>
        katex.renderToString(tex, { throwOnError: true }),
      ).not.toThrow();
    const row = {
      ...insertRecord(
        { operation: 'vector', result },
        '00000000-0000-4000-8000-000000000010',
        'Vetor',
      ),
      created_at: '2026-10-12T12:00:00Z',
    };
    const restored = reopen(row);
    expect(restored.result).toEqual(result);
    const onResult = vi.fn();
    render(
      <VectorWorkspace
        initial={restored.vectorInput}
        result={result}
        revision={1}
        onInvalidate={vi.fn()}
        onResult={onResult}
      />,
    );
    expect(
      (screen.getByLabelText('Operação vetorial') as HTMLSelectElement).value,
    ).toBe(operation);
    const count = vectorDisplay(result).steps.length;
    change('Etapa vetorial', String(count - 1));
    expect(
      screen.getByRole('heading', {
        name: vectorDisplay(result).steps[count - 1]!.title,
        level: 4,
      }),
    ).toBeTruthy();
    solve();
    expect(onResult).toHaveBeenCalledWith(result);
    expect(() =>
      reopen({
        ...row,
        payload: { ...result, input: { ...result.input, operation: 'bad' } },
      }),
    ).toThrow();
    expect(() =>
      reopen({ ...row, payload: { ...result, unexpected: true } }),
    ).toThrow();
  },
);
it('invalidates results on component, dimension and operation changes; keeps matrix area working', () => {
  render(<App />);
  change('Área de cálculo', 'vector');
  solve();
  expect(screen.getByLabelText('Etapa vetorial')).toBeTruthy();
  change('u, componente 1', '3');
  expect(screen.queryByLabelText('Etapa vetorial')).toBeNull();
  solve();
  change('Dimensão', '2');
  expect(screen.queryByLabelText('Etapa vetorial')).toBeNull();
  solve();
  change('Operação vetorial', 'norm');
  expect(screen.queryByLabelText('Etapa vetorial')).toBeNull();
  solve();
  change('Área de cálculo', 'matrix');
  solve();
  expect(
    screen.getByRole('heading', { name: 'Solução única (SPD)' }),
  ).toBeTruthy();
});
it('focuses an invalid component and distinguishes undefined operations', () => {
  render(<App />);
  change('Área de cálculo', 'vector');
  change('u, componente 1', '√2');
  solve();
  expect(document.activeElement).toBe(screen.getByLabelText('u, componente 1'));
  expect(screen.getByRole('alert')).toBeTruthy();
  change('Dimensão', '1');
  change('u, componente 1', '0');
  change('Operação vetorial', 'normalize');
  solve();
  expect(screen.getByText(/Normalização indefinida/)).toBeTruthy();
  change('Operação vetorial', 'angle');
  solve();
  expect(screen.getByText(/Ângulo indefinido/)).toBeTruthy();
  change('Operação vetorial', 'projection');
  change('v, componente 1', '0');
  solve();
  expect(screen.getByText(/Projeção indefinida/)).toBeTruthy();
  change('Operação vetorial', 'norm');
  solve();
  expect(screen.queryByText(/indefinida/)).toBeNull();
});
it('keeps roots exact and uses approximation sign only for angles', () => {
  const input = {
    operation: 'norm' as const,
    left: ['1', '1'],
    right: ['1', '0'],
    scalar: '1',
  };
  expect(vectorDisplay(calculateVector(input)).summary).toContain('\\sqrt{2}');
  expect(
    vectorDisplay(calculateVector({ ...input, operation: 'angle' })).summary,
  ).toContain('\\approx 45.000000');
});
it('validates undefined snapshots, long decimals and angle approximations', () => {
  for (const operation of ['normalize', 'angle', 'projection'] as const) {
    const result = calculateVector({
      operation,
      left: ['0'],
      right: ['0'],
      scalar: '1',
    });
    const row = {
      ...insertRecord(
        { operation: 'vector', result },
        '00000000-0000-4000-8000-000000000010',
        'Zero',
      ),
      created_at: '2026-10-12T12:00:00Z',
    };
    expect(reopen(row).result).toEqual(result);
    expect(() =>
      reopen({ ...row, payload: { ...result, reason: 'bad' } }),
    ).toThrow();
  }
  const input = {
    operation: 'angle' as const,
    left: ['12345678901234567890123456789012.123456789012', '1'],
    right: ['1', '1'],
    scalar: '1',
  };
  const result = calculateVector(input);
  if (!('approximation' in result)) throw Error('angle');
  const row = {
    ...insertRecord(
      { operation: 'vector', result },
      '00000000-0000-4000-8000-000000000010',
      'Ângulo',
    ),
    created_at: '2026-10-12T12:00:00Z',
  };
  expect(reopen(row).vectorInput!.left).toEqual(input.left);
  expect(
    reopen({
      ...row,
      payload: {
        ...result,
        approximation: {
          ...result.approximation,
          value: result.approximation.value + 1e-12,
        },
      },
    }).result,
  ).toEqual(result);
  expect(() =>
    reopen({
      ...row,
      payload: {
        ...result,
        approximation: { ...result.approximation, value: 10 },
      },
    }),
  ).toThrow();
});
