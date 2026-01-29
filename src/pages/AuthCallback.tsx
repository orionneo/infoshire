import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';

function safeNext(next: string | null) {
  return !!next && next.startsWith('/') && !next.startsWith('//') && !next.includes('http');
}

function findVerifierHint() {
  try {
    const keys = Object.keys(localStorage);
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
  } catch (error) {
    return { error: String(error) };
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();
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

      console.log('[AuthCallback] href', window.location.href);
      console.log('[AuthCallback] hasCode', !!code, 'next', next);
      console.log('[AuthCallback] storage hint', findVerifierHint());

      if (!code) {
        setErrorMsg('Callback sem código de autenticação (code ausente).');
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      console.log('[AuthCallback] exchange', {
        hasSession: !!data?.session,
        error: error?.message ?? null,
      });

      if (error || !data?.session) {
        console.error('[AuthCallback] exchangeCodeForSession failed', error);
        setErrorMsg(error?.message ?? 'Falha ao criar sessão a partir do code.');
        return;
      }

      let nextPath = '/';
      if (safeNext(next) && next) {
        nextPath = next;
      }
      navigate(nextPath, { replace: true });
    };

    run().catch((error) => {
      console.error('[AuthCallback] fatal', error);
      setErrorMsg(String(error));
    });
  }, [navigate]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <h1 className="text-xl font-semibold">Não foi possível concluir o login</h1>
        <pre className="max-w-[900px] w-full whitespace-pre-wrap break-words text-sm opacity-80">
          {errorMsg}
        </pre>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded bg-primary text-white"
            onClick={() => window.location.reload()}
            type="button"
          >
            Tentar novamente
          </button>
          <button
            className="px-4 py-2 rounded border"
            onClick={() => navigate('/login', { replace: true })}
            type="button"
          >
            Voltar ao login
          </button>
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
