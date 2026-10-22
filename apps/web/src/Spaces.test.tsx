// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'katex';
import { analyzeSpan, solveLinearCombination } from '@linear-steps/math-core';
import { App } from './App';
import { SpanWorkspace, SpanSteps } from './Spaces';
import { spanDisplay } from './span-operations';
import { insertRecord, reopen } from './history/records';

afterEach(cleanup);
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const solve = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Resolver passo a passo' }),
  );
const enter = () => {
  render(<App />);
  change('Área de cálculo', 'span');
};

it('selects original basis vectors, navigates Gauss and invalidates edits', () => {
  enter();
  solve();
  expect(
    screen.getByRole('heading', {
      name: 'Vetores linearmente dependentes (LD)',
    }),
  ).toBeTruthy();
  expect(
    screen.getByText('Base selecionada dos vetores originais: v1, v3.'),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima →' }));
  expect(screen.getAllByText('pivô').length).toBeGreaterThan(0);
  expect(document.querySelector('.katex-error')).toBeNull();
  change('Quantidade de vetores', '2');
  expect(screen.queryByLabelText('Selecionar etapa')).toBeNull();
  expect(screen.queryByLabelText('v3, componente 1')).toBeNull();
  solve();
  change('Dimensão ambiente', '2');
  expect(screen.queryByLabelText('Selecionar etapa')).toBeNull();
});

it('explains spanning, a basis and the zero space without fictional basis vectors', () => {
  enter();
  change('Exemplo de espaço vetorial', 'basis');
  solve();
  expect(
    screen.getByRole('heading', {
      name: 'Vetores linearmente independentes (LI)',
    }),
  ).toBeTruthy();
  expect(screen.getByText(/É uma base de Rⁿ/)).toBeTruthy();
  change('Exemplo de espaço vetorial', 'zero');
  solve();
  expect(
    screen.getByText('O espaço gerado é {0}; sua base é vazia.'),
  ).toBeTruthy();
  expect(document.querySelector('.katex-error')).toBeNull();
});

it('shows all combination classifications and clears results when switching operation', () => {
  enter();
  solve();
  change('Operação de espaço vetorial', 'linear-combination');
  expect(screen.queryByLabelText('Selecionar etapa')).toBeNull();
  solve();
  expect(
    screen.getByRole('heading', { name: 'Infinitas soluções (SPI)' }),
  ).toBeTruthy();
  change('Exemplo de espaço vetorial', 'outside');
  solve();
  expect(
    screen.getByRole('heading', {
      name: 'O vetor não pertence ao espaço gerado',
    }),
  ).toBeTruthy();
  change('Exemplo de espaço vetorial', 'basis');
  solve();
  expect(
    screen.getByRole('heading', { name: 'Solução única (SPD)' }),
  ).toBeTruthy();
  expect(document.activeElement?.id).toBe('space-result-heading');
});

it('focuses invalid fields and validates the target only in combination mode', () => {
  enter();
  change('v1, componente 1', '√2');
  solve();
  expect(screen.getByRole('alert').textContent).toContain('v1, componente 1');
  expect(document.activeElement).toBe(
    screen.getByLabelText('v1, componente 1'),
  );
  change('v1, componente 1', '1');
  change('Operação de espaço vetorial', 'linear-combination');
  change('b, componente 1', 'a');
  solve();
  expect(document.activeElement).toBe(screen.getByLabelText('b, componente 1'));
  change('Operação de espaço vetorial', 'span-basis');
  solve();
  expect(screen.queryByRole('alert')).toBeNull();
  change('Área de cálculo', 'matrix');
  solve();
  expect(
    screen.getByRole('heading', { name: 'Solução única (SPD)' }),
  ).toBeTruthy();
});

const cases = [
  analyzeSpan([
    ['1', '0'],
    ['0', '1'],
  ]),
  analyzeSpan([
    ['1', '2'],
    ['2', '4'],
  ]),
  analyzeSpan([['0', '0']]),
  solveLinearCombination([['1']], ['2/3']),
  solveLinearCombination([['0']], ['0']),
  solveLinearCombination([['0']], ['1']),
];
it.each(cases)(
  'renders and restores $operation with exact validated payload',
  (result) => {
    const row = {
      ...insertRecord(
        { operation: 'span', result },
        '00000000-0000-4000-8000-000000000010',
        'Espaço',
      ),
      created_at: '2026-10-14T12:00:00Z',
    };
    const saved = reopen(row);
    expect(saved.result).toEqual(result);
    expect(saved.spanInput?.operation).toBe(result.operation);
    render(
      <SpanWorkspace
        initial={saved.spanInput}
        result={result}
        revision={1}
        onInvalidate={() => {}}
        onResult={() => {}}
      />,
    );
    expect(
      (
        screen.getByLabelText(
          'Operação de espaço vetorial',
        ) as HTMLSelectElement
      ).value,
    ).toBe(result.operation);
    expect(document.querySelector('.katex-error')).toBeNull();
    const display = spanDisplay(result);
    for (const tex of [display.setup, ...display.formulas])
      expect(() =>
        renderToString(tex, { throwOnError: true, strict: 'error' }),
      ).not.toThrow();
    for (const payload of [
      { ...result, vectors: [] },
      { ...result, system: { ...result.system, steps: [] } },
      { ...result, ambientDimension: 6 },
      { ...result, extra: true },
      result.operation === 'span-basis'
        ? { ...result, basisIndices: [5] }
        : { ...result, belongsToSpan: !result.belongsToSpan },
    ])
      expect(() => reopen({ ...row, payload })).toThrow();
    expect(() => reopen({ ...row, algorithm_version: 'bad' })).toThrow();
    expect(() => reopen({ ...row, operation: 'system' })).toThrow();
  },
);

it('restores large valid decimals without losing exactness', () => {
  const value = '12345678901234567890123456789012.123456789012';
  const result = solveLinearCombination([[value]], [value]);
  const saved = reopen({
    ...insertRecord(
      { operation: 'span', result },
      '00000000-0000-4000-8000-000000000010',
      'Decimal',
    ),
    created_at: '2026-10-14T12:00:00Z',
  });
  expect(saved.spanInput?.vectors).toEqual([[value]]);
});

it('resets navigation for a newly restored resolution', () => {
  const view = render(<SpanSteps key={1} result={cases[1]!} />);
  fireEvent.click(screen.getByRole('button', { name: 'Próxima →' }));
  view.rerender(<SpanSteps key={2} result={cases[0]!} />);
  expect(
    (screen.getByLabelText('Selecionar etapa') as HTMLSelectElement).value,
  ).toBe('0');
});
