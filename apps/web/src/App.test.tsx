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
const operation = (value: string) =>
  fireEvent.change(screen.getByLabelText('Operação'), { target: { value } });

describe('matrix operations interface', () => {
  it('reduces a rectangular matrix without mislabeling its last column as b', () => {
    render(<App />);
    operation('rref');
    example('0');
    expect(screen.getAllByRole('textbox')).toHaveLength(12);
    solve();
    expect(
      screen.getByRole('heading', { name: 'Forma escalonada reduzida' }),
    ).toBeTruthy();
    expect(screen.getByText('Posto de A: 3')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Matriz inicial' }),
    ).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Coluna 4' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'b' })).toBeNull();
  });
  it('shows an inverse, augmented blocks, scaling and keyboard navigation', () => {
    const { container } = render(<App />);
    operation('inverse');
    example('3');
    solve();
    expect(
      screen.getByRole('heading', { name: 'Matriz inversa' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: 'Direita 2' }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Selecionar etapa'), {
      target: { value: '2' },
    });
    expect(
      screen.getByRole('heading', { name: 'Normalizar pivô da linha 1' }),
    ).toBeTruthy();
    expect(container.querySelector('.changed-row .pivot-cell')).not.toBeNull();
    expect(
      container.querySelector('.step-card annotation')?.textContent,
    ).toContain('\\frac{1}{2}');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Próxima →' }), {
      key: 'End',
    });
    expect(
      (screen.getByRole('button', { name: 'Próxima →' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    const answer = container.querySelector('.answer')!.innerHTML;
    fireEvent.click(screen.getByLabelText('Aproximar valores das matrizes'));
    expect(container.querySelector('.answer')!.innerHTML).toBe(answer);
    fireEvent.click(screen.getByLabelText('Mostrar todas as etapas'));
    expect(screen.getAllByRole('article').length).toBeGreaterThan(4);
    expect(container.querySelector('.katex-error')).toBeNull();
  });
  it('explains singularity and rejects a rectangular inverse', () => {
    render(<App />);
    operation('inverse');
    example('2');
    solve();
    expect(
      screen.getByRole('heading', { name: 'Matriz singular — sem inversa' }),
    ).toBeTruthy();
    expect(screen.getByText(/O bloco direito não é uma inversa/)).toBeTruthy();
    example('0');
    solve();
    expect(screen.getByRole('alert').textContent).toContain('quadrada');
    expect(
      screen.queryByRole('heading', { name: 'Matriz singular — sem inversa' }),
    ).toBeNull();
  });
  it('invalidates on operation changes, preserves coefficients and validates visible fields', () => {
    render(<App />);
    solve();
    fireEvent.change(screen.getByLabelText('Linha 1, termo independente'), {
      target: { value: '1/0' },
    });
    operation('rref');
    solve();
    expect(screen.queryByRole('alert')).toBeNull();
    const cell = screen.getByLabelText('Linha 1, coluna 1');
    expect((cell as HTMLInputElement).value).toBe('2');
    fireEvent.change(cell, { target: { value: '1/0' } });
    expect(
      screen.queryByRole('heading', { name: 'Forma escalonada reduzida' }),
    ).toBeNull();
    solve();
    expect(document.activeElement).toBe(cell);
    expect(cell.getAttribute('aria-invalid')).toBe('true');
    example('1');
    operation('inverse');
    solve();
    expect(
      screen.getByRole('heading', { name: 'Matriz inversa' }),
    ).toBeTruthy();
    operation('rref');
    expect(
      screen.queryByRole('heading', { name: 'Matriz inversa' }),
    ).toBeNull();
  });
  it('handles a 6 by 6 inverse with all twelve augmented columns', () => {
    render(<App />);
    operation('inverse');
    for (const label of ['Linhas', 'Colunas'])
      fireEvent.change(screen.getByLabelText(label), {
        target: { value: '6' },
      });
    for (let i = 1; i <= 6; i++)
      for (let j = 1; j <= 6; j++)
        fireEvent.change(screen.getByLabelText(`Linha ${i}, coluna ${j}`), {
          target: { value: i === j ? '1' : '0' },
        });
    solve();
    expect(
      screen.getByRole('heading', { name: 'Matriz inversa' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: 'Direita 6' }),
    ).toBeTruthy();
    expect(screen.getAllByRole('textbox')).toHaveLength(36);
    expect(screen.getByText('Posto de A: 6')).toBeTruthy();
  });
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
