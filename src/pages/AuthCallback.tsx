import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/db/supabase';

function safeNext(next: string | null) {
  return !!next && next.startsWith('/') && !next.startsWith('//') && !next.includes('http');
}

function getPkceKeys() {
  try {
    return Object.keys(localStorage).filter((key) => /supabase|code|pkce|verifier/i.test(key));
  } catch {
    return [];
  }
}

function getVerifierDetails(keys: string[]) {
  try {
    const explicit = localStorage.getItem('supabase.auth.code_verifier');
    const detectedKey = keys.find((key) => key.toLowerCase().includes('code-verifier')) ?? null;
    const detectedValue = detectedKey ? localStorage.getItem(detectedKey) : null;
    return { explicit, detectedKey, detectedValue };
  } catch (error) {
    return { explicit: null, detectedKey: null, detectedValue: String(error) };
  }
}

export default function AuthCallback() {
  const ran = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) {
      return;
    }
    ran.current = true;

    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const next = url.searchParams.get('next');
      const pkceDebug = url.searchParams.get('pkce_debug') === '1';

      if (pkceDebug) {
        console.log('[PKCE] href', window.location.href);
        console.log('[PKCE] code present', Boolean(code));
        const keys = getPkceKeys();
        console.log('[PKCE] localStorage keys', keys);
        const verifierDetails = getVerifierDetails(keys);
        console.log('[PKCE] verifier explicit', verifierDetails.explicit);
        console.log('[PKCE] verifier detected key', verifierDetails.detectedKey);
        console.log('[PKCE] verifier detected value', verifierDetails.detectedValue);
      }

      if (!code) {
        setErrorMsg('Código de autorização ausente.');
        return;
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (pkceDebug) {
          console.log('[PKCE] exchange result', data);
          if (error) {
            console.log('[PKCE] exchange error', error);
          }
        }

        if (error) {
          setErrorMsg(error.message);
          return;
        }
      } catch (error) {
        if (pkceDebug) {
          console.log('[PKCE] exchange exception', error);
        }
        setErrorMsg(error instanceof Error ? error.message : String(error));
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        setErrorMsg('Sessão não encontrada após o PKCE exchange.');
        return;
      }

      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, phone')
        .eq('id', userId)
        .maybeSingle();

      if (!profile && !profileError) {
        const fallback = await supabase
          .from('profiles')
          .select('role, phone')
          .eq('user_id', userId)
          .maybeSingle();
        profile = fallback.data;
        profileError = fallback.error;
      }

      if (profileError) {
        console.error('[AuthCallback] profile fetch error', profileError);
      }

      let nextPath = '/client';
      if (safeNext(next) && next) {
        nextPath = next;
      } else if (profile?.role === 'admin') {
        nextPath = '/admin';
      } else if (!profile?.phone) {
        nextPath = '/complete-profile';
      }

      window.location.replace(nextPath);
    };

    run().catch((error) => {
      console.error('[AuthCallback] fatal', error);
      setErrorMsg(error instanceof Error ? error.message : String(error));
    });
  }, []);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Falha no PKCE exchange</h1>
        <p className="text-sm opacity-80">{errorMsg}</p>
        <div className="text-sm opacity-80 space-y-1">
          <p>Dicas: desabilitar Tracking Prevention/exceção para infoshire.com.br</p>
          <p>Desabilitar extensões e testar guest profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Finalizando login...</div>
    </div>
  );
}
