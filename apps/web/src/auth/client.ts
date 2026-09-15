import { createClient } from '@supabase/supabase-js';
import { createAccountController } from './controller';

export function readAuthConfig(url: unknown, key: unknown) {
  if (!url && !key) return null;
  if (
    typeof url !== 'string' ||
    typeof key !== 'string' ||
    !key.startsWith('sb_publishable_')
  )
    throw new Error('Use a URL e a chave publicável do projeto Supabase.');
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/'
  )
    throw new Error('Use a URL HTTPS do projeto Supabase.');
  return { url: parsed.origin, key };
}

function configuredAccount() {
  try {
    const config = readAuthConfig(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    );
    if (!config) return { controller: null, error: null };
    const client = createClient(config.url, config.key, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    const controller = createAccountController(
      client.auth,
      new URL(window.location.href),
      (url) => window.history.replaceState(null, '', url),
    );
    return { controller, error: null };
  } catch {
    return {
      controller: null,
      error:
        'A configuração de acesso está indisponível. Você pode continuar usando a calculadora.',
    };
  }
}
export const account = configuredAccount();
