// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { Account } from './Account';
import { createAccountController, authMessage } from './controller';
import { readAuthConfig } from './client';

afterEach(cleanup);
const user = { id: 'test-user', email: 'student@example.test' } as User;
const session = { user } as Session;
function setup(url = 'http://localhost/?keep=1') {
  let listener: (
    event: AuthChangeEvent,
    session: Session | null,
  ) => void = () => {};
  const auth = {
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockImplementation((callback) => {
      listener = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    exchangeCodeForSession: vi
      .fn()
      .mockResolvedValue({ data: { session }, error: null }),
    signInWithPassword: vi
      .fn()
      .mockResolvedValue({ data: { user, session }, error: null }),
    signUp: vi
      .fn()
      .mockResolvedValue({ data: { user, session: null }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  const cleanUrl = vi.fn();
  const controller = createAccountController(auth, new URL(url), cleanUrl);
  return {
    auth,
    controller,
    cleanUrl,
    emit: (event: AuthChangeEvent, value: Session | null) =>
      listener(event, value),
  };
}
const enter = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('account controller', () => {
  it('exchanges a recovery code exactly once and removes it from the URL', async () => {
    const { controller, auth, cleanUrl } = setup(
      'http://localhost/?auth=recovery&code=one-time-code&keep=1',
    );
    await Promise.all([controller.start(), controller.start()]);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(cleanUrl).toHaveBeenCalledWith('/?auth=recovery&keep=1');
    expect(controller.getSnapshot()).toMatchObject({
      loading: false,
      user,
      recovery: true,
    });
    await controller.updatePassword('new-secure-password');
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: 'new-secure-password',
    });
    expect(controller.getSnapshot().recovery).toBe(false);
  });
  it('rejects expired callbacks without accepting a previous session for recovery', async () => {
    const { controller, auth, cleanUrl } = setup(
      'http://localhost/?auth=recovery&code=expired',
    );
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { code: 'flow_state_expired' },
    });
    await controller.start();
    expect(controller.getSnapshot().error).toContain('expirou');
    expect(controller.getSnapshot().recovery).toBe(false);
    expect(cleanUrl).toHaveBeenCalled();
    await expect(
      controller.updatePassword('new-secure-password'),
    ).rejects.toThrow();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it('handles error redirects without rendering raw provider text', async () => {
    const { controller, auth, cleanUrl } = setup(
      'http://localhost/#error=access_denied&error_description=private-provider-detail',
    );
    await controller.start();
    expect(controller.getSnapshot().error).not.toContain(
      'private-provider-detail',
    );
    expect(cleanUrl).toHaveBeenCalledWith('/');
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it('does not let a stale initial read overwrite a newer sign-in event', async () => {
    const { controller, auth, emit } = setup();
    let finish!: (value: unknown) => void;
    auth.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const started = controller.start();
    emit('SIGNED_IN', session);
    finish({ data: { session: null }, error: null });
    await started;
    expect(controller.getSnapshot().user).toEqual(user);
    emit('SIGNED_OUT', null);
    expect(controller.getSnapshot().user).toBeNull();
  });
  it('preserves session when signout fails and uses device-local signout', async () => {
    const { controller, auth } = setup();
    await controller.start();
    await controller.signIn('student@example.test', 'test-password');
    auth.signOut.mockResolvedValueOnce({ error: { code: 'network_error' } });
    await expect(controller.signOut()).rejects.toBeTruthy();
    expect(controller.getSnapshot().user).toEqual(user);
    await controller.signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(controller.getSnapshot().user).toBeNull();
  });
  it('requires a session on a direct recovery route', async () => {
    const { controller } = setup('http://localhost/?auth=recovery');
    await controller.start();
    expect(controller.getSnapshot().recovery).toBe(false);
    expect(controller.getSnapshot().error).toContain('novo link');
  });
});

describe('account interface', () => {
  it('keeps a clear unavailable state without configuration', () => {
    render(<Account controller={null} />);
    expect(screen.getByText(/calculadora funciona sem login/)).toBeTruthy();
    expect(screen.queryByLabelText('Senha')).toBeNull();
  });
  it('signs in and out, clears passwords and initializes once under StrictMode', async () => {
    const { controller, auth } = setup();
    render(
      <StrictMode>
        <Account controller={controller} />
      </StrictMode>,
    );
    await screen.findByLabelText('E-mail');
    enter('E-mail', 'student@example.test');
    enter('Senha', 'test-password');
    fireEvent.click(screen.getByRole('button', { name: 'Acessar' }));
    await screen.findByText('Conectado como student@example.test');
    expect(auth.getSession).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Sair deste dispositivo' }),
    );
    await screen.findByLabelText('Senha');
    expect((screen.getByLabelText('Senha') as HTMLInputElement).value).toBe('');
  });
  it('validates password confirmation and sends the signup redirect', async () => {
    const { controller, auth } = setup();
    render(<Account controller={controller} />);
    await screen.findByLabelText('E-mail');
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    enter('E-mail', 'student@example.test');
    enter('Nova senha', 'long-password-123');
    enter('Confirmar senha', 'different-password');
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));
    expect(screen.getByRole('alert').textContent).toContain('iguais');
    expect(auth.signUp).not.toHaveBeenCalled();
    enter('Confirmar senha', 'long-password-123');
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));
    await screen.findByText(/Se o cadastro puder ser concluído/);
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'student@example.test',
      password: 'long-password-123',
      options: { emailRedirectTo: 'http://localhost/' },
    });
  });
  it('requests recovery without claiming the account exists', async () => {
    const { controller, auth } = setup();
    render(<Account controller={controller} />);
    await screen.findByLabelText('E-mail');
    fireEvent.click(screen.getByRole('button', { name: 'Recuperar senha' }));
    enter('E-mail', 'student@example.test');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    await screen.findByText(/Se houver uma conta/);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'student@example.test',
      { redirectTo: 'http://localhost/?auth=recovery' },
    );
  });
  it('shows recovery before the signed-in view and completes password update', async () => {
    const { controller, auth } = setup(
      'http://localhost/?auth=recovery&code=valid',
    );
    render(<Account controller={controller} />);
    await screen.findByLabelText('Nova senha');
    expect(screen.queryByText(/Conectado como/)).toBeNull();
    enter('Nova senha', 'replacement-password');
    enter('Confirmar senha', 'replacement-password');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await screen.findByText('Senha atualizada.');
    expect(auth.updateUser).toHaveBeenCalledTimes(1);
  });
  it('blocks duplicate submits and recovers after a network error', async () => {
    const { controller, auth } = setup();
    let reject!: (error: Error) => void;
    auth.signInWithPassword.mockImplementation(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    render(<Account controller={controller} />);
    await screen.findByLabelText('E-mail');
    enter('E-mail', 'student@example.test');
    enter('Senha', 'test-password');
    const form = screen.getByLabelText('Senha').closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
    reject(new Error('private network details'));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('conexão'),
    );
    expect((screen.getByLabelText('Senha') as HTMLInputElement).value).toBe('');
  });
});

describe('configuration and error handling', () => {
  it('accepts only an HTTPS project URL with a publishable key', () => {
    expect(readAuthConfig('', '')).toBeNull();
    expect(
      readAuthConfig('https://project.supabase.co', 'sb_publishable_test'),
    ).toEqual({
      url: 'https://project.supabase.co',
      key: 'sb_publishable_test',
    });
    for (const key of ['sb_secret_test', 'service-role-token', ''])
      expect(() =>
        readAuthConfig('https://project.supabase.co', key),
      ).toThrow();
    expect(() =>
      readAuthConfig('http://project.supabase.co', 'sb_publishable_test'),
    ).toThrow();
  });
  it('maps common authentication errors without exposing raw messages', () => {
    expect(authMessage({ code: 'invalid_credentials' })).toContain('inválidos');
    expect(authMessage({ code: 'email_not_confirmed' })).toContain('Confirme');
    expect(authMessage({ code: 'over_email_send_rate_limit' })).toContain(
      'Aguarde',
    );
    expect(authMessage(new Error('secret'))).not.toContain('secret');
  });
});
