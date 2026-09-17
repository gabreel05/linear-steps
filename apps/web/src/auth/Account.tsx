import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { account } from './client';
import { authMessage, type AccountController } from './controller';

function ConnectedAccount({ controller }: { controller: AccountController }) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    void controller.start();
  }, [controller]);
  async function perform(action: () => Promise<void>, success: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setError(authMessage(cause));
    } finally {
      setPassword('');
      setConfirmation('');
      setBusy(false);
      locked.current = false;
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if ((state.recovery || mode === 'signup') && password !== confirmation) {
      setError('As senhas precisam ser iguais.');
      return;
    }
    if (state.recovery)
      void perform(
        () => controller.updatePassword(password),
        'Senha atualizada.',
      );
    else if (mode === 'login')
      void perform(
        () => controller.signIn(email.trim(), password),
        'Acesso realizado.',
      );
    else if (mode === 'signup')
      void perform(
        () => controller.signUp(email.trim(), password),
        'Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Confira também o spam.',
      );
    else
      void perform(
        () => controller.reset(email.trim()),
        'Se houver uma conta para este e-mail, você receberá o link de recuperação.',
      );
  }
  const newPassword = state.recovery || mode === 'signup';
  return (
    <section className="account-panel" aria-labelledby="account-heading">
      <h2 id="account-heading">
        {state.recovery ? 'Definir nova senha' : 'Sua conta'}
      </h2>
      {state.loading ? (
        <p role="status">Verificando sessão…</p>
      ) : (
        <>
          {state.user && !state.recovery ? (
            <div className="account-session">
              <p>Conectado como {state.user.email}</p>
              <button
                disabled={busy}
                onClick={() =>
                  void perform(
                    () => controller.signOut(),
                    'Você saiu deste dispositivo.',
                  )
                }
              >
                Sair deste dispositivo
              </button>
            </div>
          ) : (
            <>
              {!state.recovery && (
                <div className="account-modes" aria-label="Acesso à conta">
                  {(['login', 'signup', 'reset'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={mode === value}
                      disabled={busy}
                      onClick={() => {
                        setMode(value);
                        setError('');
                        setMessage('');
                        setPassword('');
                        setConfirmation('');
                      }}
                    >
                      {
                        {
                          login: 'Entrar',
                          signup: 'Criar conta',
                          reset: 'Recuperar senha',
                        }[value]
                      }
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={submit}>
                <fieldset disabled={busy}>
                  <legend className="sr-only">
                    {state.recovery
                      ? 'Nova senha'
                      : {
                          login: 'Entrar na conta',
                          signup: 'Cadastro',
                          reset: 'Recuperação de senha',
                        }[mode]}
                  </legend>
                  {!state.recovery && (
                    <label className="field">
                      E-mail
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </label>
                  )}
                  {(state.recovery || mode !== 'reset') && (
                    <label className="field">
                      {newPassword ? 'Nova senha' : 'Senha'}
                      <input
                        type="password"
                        autoComplete={
                          newPassword ? 'new-password' : 'current-password'
                        }
                        required
                        minLength={newPassword ? 12 : 1}
                        maxLength={128}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </label>
                  )}
                  {newPassword && (
                    <>
                      <p className="hint">Use de 12 a 128 caracteres.</p>
                      <label className="field">
                        Confirmar senha
                        <input
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={12}
                          maxLength={128}
                          value={confirmation}
                          onChange={(event) =>
                            setConfirmation(event.target.value)
                          }
                        />
                      </label>
                    </>
                  )}
                  <button className="primary" type="submit">
                    {busy
                      ? 'Aguarde…'
                      : state.recovery
                        ? 'Salvar nova senha'
                        : {
                            login: 'Acessar',
                            signup: 'Cadastrar',
                            reset: 'Enviar link',
                          }[mode]}
                  </button>
                </fieldset>
              </form>
              {(mode !== 'login' || state.recovery) && (
                <p className="hint">
                  Abra o link do e-mail neste mesmo navegador, onde iniciou o
                  pedido.
                </p>
              )}
              {state.recovery && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void perform(
                      () => controller.signOut(),
                      'Recuperação encerrada. Solicite outro link quando precisar.',
                    )
                  }
                >
                  Cancelar recuperação e sair
                </button>
              )}
            </>
          )}
          {(error || state.error) && (
            <p className="error" role="alert">
              {error || state.error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <p className="hint">
            Seus cálculos podem ser salvos no histórico desta conta.
          </p>
        </>
      )}
    </section>
  );
}

export function Account({
  controller = account.controller,
  configurationError = account.error,
}: {
  controller?: AccountController | null;
  configurationError?: string | null;
}) {
  if (!controller)
    return (
      <section className="account-panel">
        <h2>Sua conta</h2>
        <p>
          {configurationError ??
            'O acesso à conta ainda não está disponível neste ambiente. A calculadora funciona sem login.'}
        </p>
      </section>
    );
  return <ConnectedAccount controller={controller} />;
}
