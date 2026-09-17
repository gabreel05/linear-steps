import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { account } from '../auth/client';
import { historyRepository, type HistoryRepository } from './repository';
import {
  insertRecord,
  labels,
  type Draft,
  type Operation,
  type RecordInsert,
  type SavedInput,
  type Summary,
} from './records';

function Save({
  draft,
  repository,
  onSaved,
  current,
}: {
  draft: Draft;
  repository: HistoryRepository;
  onSaved(): void;
  current(): boolean;
}) {
  const [title, setTitle] = useState(labels[draft.operation]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const record = useRef<RecordInsert | null>(null);
  const [validationError, setValidationError] = useState('');
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const save = async () => {
    if (locked.current || !current()) return;
    locked.current = true;
    setStatus('saving');
    setValidationError('');
    try {
      record.current ??= insertRecord(draft, crypto.randomUUID(), title);
      await repository.save(record.current);
      if (alive.current && current()) {
        setStatus('saved');
        onSaved();
      }
    } catch {
      if (alive.current && current()) {
        if (!record.current) {
          setValidationError(
            'Este cálculo não atende ao formato ou ao limite de 1 MiB do histórico. Sua resolução continua disponível.',
          );
          setStatus('idle');
        } else setStatus('error');
      }
    } finally {
      locked.current = false;
    }
  };
  return (
    <div className="save-calculation">
      <label className="field">
        Título do cálculo
        <input
          value={title}
          maxLength={120}
          disabled={status !== 'idle'}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <button
        disabled={!title.trim() || status === 'saving' || status === 'saved'}
        onClick={() => void save()}
      >
        {status === 'saving'
          ? 'Salvando…'
          : status === 'saved'
            ? 'Salvo'
            : status === 'error'
              ? 'Tentar salvar novamente'
              : 'Salvar no histórico'}
      </button>
      {status === 'saved' && <p role="status">Cálculo salvo na sua conta.</p>}
      {validationError && (
        <p role="alert" className="error">
          {validationError}
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="error">
          Não foi possível confirmar o salvamento. Sua resolução continua
          disponível. Verifique a conexão e tente novamente; a tentativa usa o
          mesmo registro para evitar cópias.
        </p>
      )}
    </div>
  );
}

export function HistoryPanel({
  repository,
  draft,
  revision,
  onOpen,
  current,
}: {
  repository: HistoryRepository;
  draft: Draft | null;
  revision: number;
  onOpen(value: SavedInput): void;
  current(): boolean;
}) {
  const [filter, setFilter] = useState<Operation | ''>('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Summary[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);
  const alive = useRef(true);
  const locked = useRef(false);
  const prepare = useCallback(() => {
    setLoading(true);
    setError('');
    setRows([]);
    setMore(false);
  }, []);
  const invalidateRequest = useCallback(() => {
    sequence.current++;
  }, []);
  const load = useCallback(() => {
    const request = ++sequence.current;
    return repository
      .list(filter, page)
      .then((data) => {
        if (alive.current && current() && request === sequence.current) {
          setRows(data.rows);
          setMore(data.more);
        }
      })
      .catch(() => {
        if (alive.current && current() && request === sequence.current)
          setError(
            'Não foi possível carregar o histórico. Verifique a conexão e a configuração do banco e tente Atualizar.',
          );
      })
      .finally(() => {
        if (alive.current && current() && request === sequence.current)
          setLoading(false);
      });
  }, [repository, filter, page, current]);
  const refresh = useCallback(() => {
    prepare();
    return load();
  }, [prepare, load]);
  useEffect(() => {
    alive.current = true;
    void load();
    const focus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      alive.current = false;
      invalidateRequest();
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [load, refresh, invalidateRequest]);
  const act = async (id: string, remove: boolean) => {
    if (locked.current || !current()) return;
    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (remove) {
        await repository.remove(id);
        if (alive.current && current()) {
          setConfirmation(null);
          setNotice('Registro excluído.');
          await refresh();
        }
      } else {
        const value = await repository.open(id);
        if (alive.current && current()) {
          onOpen(value);
          setNotice('Cálculo reaberto.');
        }
      }
    } catch (cause) {
      if (alive.current && current())
        setError(
          !remove && cause instanceof Error
            ? cause.message
            : 'Não foi possível excluir. Atualize o histórico e tente novamente.',
        );
    } finally {
      locked.current = false;
      if (alive.current && current()) setBusy(false);
    }
  };
  return (
    <section className="history-panel" aria-labelledby="history-heading">
      <h2 id="history-heading">Seu histórico</h2>
      <p className="hint">
        Salve uma resolução para consultá-la em outros dispositivos. A lista é
        atualizada ao voltar à aba ou ao clicar em Atualizar.
      </p>
      {draft && (
        <Save
          key={revision}
          draft={draft}
          repository={repository}
          current={current}
          onSaved={() => void refresh()}
        />
      )}
      <div className="history-actions">
        <label className="field">
          Filtrar histórico
          <select
            value={filter}
            disabled={busy}
            onChange={(e) => {
              setFilter(e.target.value as Operation | '');
              prepare();
              setPage(0);
              setConfirmation(null);
            }}
          >
            <option value="">Todas as operações</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button disabled={loading || busy} onClick={() => void refresh()}>
          Atualizar histórico
        </button>
      </div>
      {loading && <p role="status">Carregando histórico…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!loading && !error && rows.length === 0 && (
        <p>Nenhum cálculo nesta página.</p>
      )}
      <ul className="history-list">
        {rows.map((row) => (
          <li key={row.id}>
            <div>
              <strong>{row.title}</strong>
              <p className="hint">
                {labels[row.operation]} ·{' '}
                {new Date(row.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="history-actions">
              <button
                disabled={busy}
                onClick={() => void act(row.id, false)}
                aria-label={`Reabrir ${row.title}`}
              >
                Reabrir
              </button>
              {confirmation === row.id ? (
                <>
                  <span>Excluir permanentemente este registro?</span>
                  <button
                    disabled={busy}
                    onClick={() => void act(row.id, true)}
                  >
                    Confirmar exclusão
                  </button>
                  <button disabled={busy} onClick={() => setConfirmation(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  disabled={busy}
                  onClick={() => setConfirmation(row.id)}
                  aria-label={`Excluir ${row.title}`}
                >
                  Excluir
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="history-actions">
        <button
          disabled={page === 0 || busy || loading}
          onClick={() => {
            setPage((p) => p - 1);
            prepare();
            setConfirmation(null);
          }}
        >
          Página anterior
        </button>
        <span>Página {page + 1}</span>
        <button
          disabled={!more || busy || loading}
          onClick={() => {
            setPage((p) => p + 1);
            prepare();
            setConfirmation(null);
          }}
        >
          Próxima página
        </button>
      </div>
    </section>
  );
}

function ConnectedHistory(props: {
  draft: Draft | null;
  revision: number;
  onOpen(value: SavedInput): void;
}) {
  const state = useSyncExternalStore(
    account.controller!.subscribe,
    account.controller!.getSnapshot,
  );
  const userId = state.user?.id;
  const repository = useMemo(
    () => historyRepository(() => account.historyClient!(userId!)),
    [userId],
  );
  const current = useCallback(() => {
    const now = account.controller!.getSnapshot();
    return now.user?.id === userId && !now.recovery && !now.loading;
  }, [userId]);
  if (!userId || state.loading || state.recovery)
    return (
      <p className="hint">
        Entre na sua conta para salvar e consultar o histórico.
      </p>
    );
  return (
    <HistoryPanel
      key={userId}
      {...props}
      repository={repository}
      current={current}
    />
  );
}
export function History(props: {
  draft: Draft | null;
  revision: number;
  onOpen(value: SavedInput): void;
}) {
  if (!account.controller || !account.historyClient) return null;
  return <ConnectedHistory {...props} />;
}
