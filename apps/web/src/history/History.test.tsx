// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { solveGaussian } from '@linear-steps/math-core';
import { HistoryPanel } from './History';
import type { HistoryRepository } from './repository';
import type { RecordInsert } from './records';
afterEach(cleanup);
const result = solveGaussian([['1']], ['1/3']);
const draft = { operation: 'system' as const, result };
const item = {
  id: '00000000-0000-4000-8000-000000000001',
  operation: 'system' as const,
  title: 'Meu cálculo',
  created_at: '2026-09-17T12:00:00Z',
};
function setup() {
  const repository = {
    list: vi
      .fn<HistoryRepository['list']>()
      .mockResolvedValue({ rows: [item], more: false }),
    save: vi.fn<HistoryRepository['save']>().mockResolvedValue(),
    open: vi.fn<HistoryRepository['open']>().mockResolvedValue({
      operation: 'system',
      a: [['1']],
      b: ['1/3'],
      result,
    }),
    remove: vi.fn<HistoryRepository['remove']>().mockResolvedValue(),
  };
  const current = vi.fn(() => true);
  const onOpen = vi.fn();
  const props = { repository, current, onOpen, draft, revision: 1 };
  return { ...props, props };
}
describe('history interface lifecycle', () => {
  it('retries a failed save with the same immutable id and title', async () => {
    const { props, repository } = setup();
    repository.save.mockRejectedValueOnce(new Error('offline'));
    render(<HistoryPanel {...props} />);
    fireEvent.change(screen.getByLabelText('Título do cálculo'), {
      target: { value: 'Frações' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Salvar no histórico' }),
    );
    await screen.findByRole('button', { name: 'Tentar salvar novamente' });
    expect(screen.queryByText('Cálculo salvo na sua conta.')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Tentar salvar novamente' }),
    );
    await screen.findByText('Cálculo salvo na sua conta.');
    expect(repository.save.mock.calls[0]![0]).toEqual(
      repository.save.mock.calls[1]![0],
    );
    expect(repository.save.mock.calls[0]![0].title).toBe('Frações');
  });
  it('blocks double submissions and ignores completion after account changes', async () => {
    const { props, repository, current } = setup();
    let finish!: () => void;
    repository.save.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<HistoryPanel {...props} />);
    const save = screen.getByRole('button', { name: 'Salvar no histórico' });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(repository.save).toHaveBeenCalledTimes(1);
    current.mockReturnValue(false);
    await act(async () => finish());
    expect(screen.queryByText('Cálculo salvo na sua conta.')).toBeNull();
  });
  it('requires confirmation before deleting and supports reopening', async () => {
    const { props, repository, onOpen } = setup();
    render(<HistoryPanel {...props} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reabrir Meu cálculo' }),
    );
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir Meu cálculo' }),
    );
    expect(repository.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(repository.remove).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir Meu cálculo' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    await screen.findByText('Registro excluído.');
    expect(repository.remove).toHaveBeenCalledWith(item.id);
  });
  it('ignores stale listing responses after a filter change', async () => {
    const { props, repository } = setup();
    let finish!: (
      value: Awaited<ReturnType<HistoryRepository['list']>>,
    ) => void;
    repository.list
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue({ rows: [], more: false });
    render(<HistoryPanel {...props} />);
    fireEvent.change(screen.getByLabelText('Filtrar histórico'), {
      target: { value: 'inverse' },
    });
    await screen.findByText('Nenhum cálculo nesta página.');
    await act(async () => finish({ rows: [item], more: true }));
    expect(screen.queryByText('Meu cálculo')).toBeNull();
  });
  it('refreshes on focus and resets request identity for a new resolution', async () => {
    const { props, repository } = setup();
    const ui = render(<HistoryPanel {...props} />);
    await screen.findByText('Meu cálculo');
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(repository.list).toHaveBeenCalledTimes(2));
    fireEvent.click(
      screen.getByRole('button', { name: 'Salvar no histórico' }),
    );
    await screen.findByText('Cálculo salvo na sua conta.');
    ui.rerender(<HistoryPanel {...props} revision={2} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Salvar no histórico' }),
    );
    await screen.findByText('Cálculo salvo na sua conta.');
    const calls = repository.save.mock.calls as [RecordInsert][];
    expect(calls[0]![0].id).not.toBe(calls[1]![0].id);
  });
  it('keeps failures actionable and does not reopen after leaving the account', async () => {
    const { props, repository, current, onOpen } = setup();
    repository.list.mockRejectedValueOnce(new Error('offline'));
    let finish!: (
      value: Awaited<ReturnType<HistoryRepository['open']>>,
    ) => void;
    repository.open.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<HistoryPanel {...props} />);
    await screen.findByRole('alert');
    fireEvent.click(
      screen.getByRole('button', { name: 'Atualizar histórico' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reabrir Meu cálculo' }),
    );
    current.mockReturnValue(false);
    await act(async () =>
      finish({ operation: 'system', a: [['1']], b: ['1/3'], result }),
    );
    expect(onOpen).not.toHaveBeenCalled();
  });
});
