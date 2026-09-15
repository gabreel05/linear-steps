import type { SupabaseClient, User } from '@supabase/supabase-js';

type Auth = Pick<
  SupabaseClient['auth'],
  | 'getSession'
  | 'onAuthStateChange'
  | 'exchangeCodeForSession'
  | 'signUp'
  | 'signInWithPassword'
  | 'resetPasswordForEmail'
  | 'updateUser'
  | 'signOut'
>;
export type AccountState = Readonly<{
  loading: boolean;
  user: User | null;
  recovery: boolean;
  error: string | null;
}>;

export function authMessage(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error ? error.code : null;
  switch (code) {
    case 'invalid_credentials':
      return 'E-mail ou senha inválidos.';
    case 'email_not_confirmed':
      return 'Confirme seu e-mail antes de entrar.';
    case 'weak_password':
      return 'A senha não atende aos requisitos. Use pelo menos 12 caracteres.';
    case 'same_password':
      return 'Escolha uma senha diferente da anterior.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas. Aguarde antes de tentar novamente.';
    default:
      return 'Não foi possível concluir a solicitação. Verifique sua conexão e tente novamente.';
  }
}

/** One controller per client: initialization and code exchange survive React StrictMode remounts. */
export function createAccountController(
  auth: Auth,
  location: URL,
  cleanUrl: (url: string) => void,
) {
  let state: AccountState = {
    loading: true,
    user: null,
    recovery: false,
    error: null,
  };
  const listeners = new Set<() => void>();
  let initialization: Promise<void> | undefined;
  let subscription: { unsubscribe(): void } | undefined;
  let revision = 0;
  const callback = location.searchParams.has('code');
  const recoveryRoute = location.searchParams.get('auth') === 'recovery';
  const callbackError =
    location.searchParams.has('error') ||
    new URLSearchParams(location.hash.slice(1)).has('error');
  const redirect = (recovery: boolean) =>
    `${location.origin}${location.pathname}${recovery ? '?auth=recovery' : ''}`;
  const publish = (patch: Partial<AccountState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const cleanup = () => {
    const url = new URL(location);
    for (const key of ['code', 'error', 'error_code', 'error_description'])
      url.searchParams.delete(key);
    url.hash = '';
    cleanUrl(`${url.pathname}${url.search}`);
  };
  const check = (error: unknown) => {
    if (error) throw error;
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      initialization ??= (async () => {
        subscription = auth.onAuthStateChange((event, session) => {
          revision++;
          publish({
            user: session?.user ?? null,
            recovery:
              event === 'SIGNED_OUT'
                ? false
                : event === 'PASSWORD_RECOVERY'
                  ? true
                  : state.recovery,
          });
        }).data.subscription;
        try {
          if (callbackError) throw new Error('Invalid callback');
          if (callback) {
            const { data, error } = await auth.exchangeCodeForSession(
              location.searchParams.get('code')!,
            );
            check(error);
            if (!data.session) throw new Error('Missing session');
            publish({
              user: data.session.user,
              recovery: recoveryRoute || state.recovery,
            });
          } else {
            const before = revision;
            const { data, error } = await auth.getSession();
            check(error);
            if (before === revision)
              publish({ user: data.session?.user ?? null });
            if (recoveryRoute)
              publish({
                recovery: !!state.user,
                error: state.user
                  ? null
                  : 'Solicite um novo link de recuperação para definir sua senha.',
              });
          }
        } catch {
          publish({
            recovery: false,
            error:
              callback || callbackError
                ? 'O link é inválido, expirou ou foi aberto em outro navegador. Solicite um novo link e abra-o no navegador em que iniciou o pedido.'
                : 'Não foi possível restaurar sua sessão. Tente entrar novamente.',
          });
        } finally {
          if (callback || callbackError) cleanup();
          publish({ loading: false });
        }
      })();
      return initialization;
    },
    async signIn(email: string, password: string) {
      const { data, error } = await auth.signInWithPassword({
        email,
        password,
      });
      check(error);
      publish({ user: data.user, recovery: false, error: null });
    },
    async signUp(email: string, password: string) {
      const { data, error } = await auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirect(false) },
      });
      check(error);
      if (data.session) publish({ user: data.session.user, error: null });
    },
    async reset(email: string) {
      const { error } = await auth.resetPasswordForEmail(email, {
        redirectTo: redirect(true),
      });
      check(error);
    },
    async updatePassword(password: string) {
      if (!state.user || !state.recovery)
        throw new Error('Recovery session required');
      const { error } = await auth.updateUser({ password });
      check(error);
      cleanUrl(location.pathname);
      publish({ recovery: false, error: null });
    },
    async signOut() {
      const { error } = await auth.signOut({ scope: 'local' });
      check(error);
      cleanUrl(location.pathname);
      publish({ user: null, recovery: false, error: null });
    },
    dispose() {
      subscription?.unsubscribe();
      listeners.clear();
    },
  };
}
export type AccountController = ReturnType<typeof createAccountController>;
