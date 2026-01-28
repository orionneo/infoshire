import { useEffect } from 'react';
import { supabase } from '@/db/supabase';

const safeNextFromUrl = () => {
  const url = new URL(window.location.href);
  const rawNext = url.searchParams.get('next');
  if (!rawNext) return null;
  if (rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('http')) {
    return rawNext;
  }
  return null;
};

const clearOAuthParamsFromUrl = () => {
  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);
};

const consumeOAuthFromUrlBestEffort = async () => {
  const url = new URL(window.location.href);
  const hasAuthHash = url.hash.includes('access_token=') || url.hash.includes('refresh_token=');
  const hasCode = url.searchParams.has('code');

  const authWithUrl = supabase.auth as typeof supabase.auth & {
    getSessionFromUrl?: (options?: { storeSession?: boolean }) => Promise<{ error: unknown }>;
  };

  try {
    if (typeof authWithUrl.getSessionFromUrl === 'function') {
      const { error } = await authWithUrl.getSessionFromUrl({ storeSession: true });
      if (error) {
        console.warn('[AuthCallback] getSessionFromUrl error:', error);
      } else {
        return;
      }
    }
  } catch (error) {
    console.warn('[AuthCallback] getSessionFromUrl failed:', error);
  }

  if (hasAuthHash) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) console.warn('[AuthCallback] setSession error:', error);
    }
  }

  if (hasCode) {
    const code = url.searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.warn('[AuthCallback] exchangeCodeForSession error:', error);
    }
  }
};

export default function AuthCallback() {
  useEffect(() => {
    const next = safeNextFromUrl();

    const run = async () => {
      await consumeOAuthFromUrlBestEffort();
      clearOAuthParamsFromUrl();

      const { data } = await supabase.auth.getSession();
      const sessionOk = !!data.session;

      if (!sessionOk) {
        const fallbackNext = next ?? '/client';
        window.location.replace(`/login?next=${encodeURIComponent(fallbackNext)}`);
        return;
      }

      const sessionUser = data.session?.user ?? null;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = sessionUser ?? userData.user ?? null;
      if (userError || !user) {
        console.error('Usuário não encontrado após autenticação.', userError);
        window.location.replace('/login');
        return;
      }

      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile && !profileError) {
        const fallback = await supabase
          .from('profiles')
          .select('role, phone')
          .eq('user_id', user.id)
          .maybeSingle();
        profile = fallback.data;
        profileError = fallback.error;
      }

      if (profileError) {
        console.error('Falha ao buscar perfil:', profileError);
      }

      if (next) {
        window.location.replace(next);
        return;
      }
      if (profile?.role === 'admin') {
        window.location.replace('/admin');
        return;
      }
      if (!profile?.phone) {
        window.location.replace('/complete-profile');
        return;
      }
      window.location.replace('/client');
    };

    run().catch((error) => {
      console.error('Falha ao finalizar login:', error);
      window.location.replace('/login');
    });
  }, []);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Finalizando login...</h2>
      <p>Por favor, aguarde. Se não for redirecionado, tente novamente.</p>
    </div>
  );
}
