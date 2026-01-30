import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';

function safeNext(next: string | null) {
  return !!next && next.startsWith('/') && !next.startsWith('//') && !next.includes('http');
}

function collectStorageHint(storage: Storage) {
  const keys = Object.keys(storage);
  const suspects = keys.filter((key) => {
    const normalizedKey = key.toLowerCase();
    return (
      normalizedKey.includes('code') ||
      normalizedKey.includes('verifier') ||
      normalizedKey.includes('supabase')
    );
  });

  return {
    keysCount: keys.length,
    suspectKeys: suspects.slice(0, 20),
  };
}

function findVerifierHint() {
  const hints: Record<string, unknown> = {};

  try {
    hints.localStorage = collectStorageHint(localStorage);
  } catch (error) {
    hints.localStorage = { error: String(error) };
  }

  try {
    hints.sessionStorage = collectStorageHint(sessionStorage);
  } catch (error) {
    hints.sessionStorage = { error: String(error) };
  }

  return hints;
}

const consumeOAuthFromUrlBestEffort = async () => {
  const url = new URL(window.location.href);
  const hasAuthHash = url.hash.includes('access_token=') || url.hash.includes('refresh_token=');

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
};

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
      const next = url.searchParams.get('next');

      console.log('[AuthCallback] href', window.location.href);
      console.log('[AuthCallback] hasAuthHash', url.hash.includes('access_token='), 'next', next);
      console.log('[AuthCallback] storage hint', findVerifierHint());

      await consumeOAuthFromUrlBestEffort();

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setErrorMsg('Callback inválido, volte ao login.');
        return;
      }

      let nextPath = '/client';
      if (safeNext(next) && next) {
        nextPath = next;
      }
      window.location.replace(nextPath);
    };

    run().catch((error) => {
      console.error('[AuthCallback] fatal', error);
      setErrorMsg('Callback inválido, volte ao login.');
    });
  }, []);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <h1 className="text-xl font-semibold">Callback inválido, volte ao login</h1>
        <p className="text-sm opacity-80">{errorMsg}</p>
        <Link className="px-4 py-2 rounded bg-primary text-white" to="/login">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Finalizando login...</div>
    </div>
  );
}
