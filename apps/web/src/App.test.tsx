// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';

afterEach(cleanup);
const solve = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Resolver passo a passo' }),
  );
const example = (value: string) =>
  fireEvent.change(screen.getByLabelText('Carregar exemplo'), {
    target: { value },
  });

describe('interactive system solver', () => {
  it('solves the course example, highlights pivots, navigates and shows all steps', () => {
    const { container } = render(<App />);
    solve();
    expect(
      screen.getByRole('heading', { name: 'Solução única (SPD)' }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Resolução' }),
    );
    expect(
      (screen.getByRole('button', { name: '← Anterior' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima →' }));
    expect(
      screen.getByRole('heading', { name: 'Pivô na linha 1, coluna 1' }),
    ).toBeTruthy();
    expect(container.querySelector('.pivot-cell')?.textContent).toContain(
      'pivô',
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Próxima →' }), {
      key: 'ArrowRight',
    });
    expect(container.querySelector('.changed-row')?.textContent).toContain(
      'alterada',
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Próxima →' }), {
      key: 'End',
    });
    expect(screen.getByRole('heading', { name: 'Conclusão' })).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Próxima →' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByLabelText('Mostrar todas as etapas'));
    expect(screen.getAllByRole('article').length).toBeGreaterThan(5);
    expect(container.querySelector('.katex-error')).toBeNull();
  });

  it.each([
    ['1', 'Infinitas soluções (SPI)'],
    ['2', 'Nenhuma solução (SI)'],
  ])('renders classification for example %s', (value, title) => {
    const { container } = render(<App />);
    example(value);
    solve();
    expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Mostrar todas as etapas'));
    expect(container.querySelector('.katex-error')).toBeNull();
  });

  it('clears stale results on edit, focuses invalid cells and recovers', () => {
    render(<App />);
    solve();
    const cell = screen.getByLabelText('Linha 1, coeficiente x1');
    fireEvent.change(cell, { target: { value: '1/0' } });
    expect(
      screen.queryByRole('heading', { name: 'Solução única (SPD)' }),
    ).toBeNull();
    solve();
    expect(screen.getByRole('alert').textContent).toContain('denominador');
    expect(cell.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(cell);
    fireEvent.change(cell, { target: { value: '2' } });
    solve();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Etapa 1 de');
  });

  it('preserves visible values on resize and supports a 6x6 grid', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equações'), {
      target: { value: '6' },
    });
    fireEvent.change(screen.getByLabelText('Incógnitas'), {
      target: { value: '6' },
    });
    expect(screen.getAllByRole('textbox')).toHaveLength(42);
    expect(
      (screen.getByLabelText('Linha 1, coeficiente x1') as HTMLInputElement)
        .value,
    ).toBe('2');
    expect(
      (screen.getByLabelText('Linha 6, coeficiente x6') as HTMLInputElement)
        .value,
    ).toBe('0');
    solve();
    expect(
      screen.getByRole('heading', { name: 'Infinitas soluções (SPI)' }),
    ).toBeTruthy();
  });

  it('toggles approximate matrices without changing exact result formulas', () => {
    const { container } = render(<App />);
    solve();
    const answer = container.querySelector('.answer')!.innerHTML;
    fireEvent.click(screen.getByLabelText('Aproximar valores das matrizes'));
    expect(
      screen.getByRole('table', { name: /valores aproximados/ }),
    ).toBeTruthy();
    expect(container.querySelector('.answer')!.innerHTML).toBe(answer);
  });
});
