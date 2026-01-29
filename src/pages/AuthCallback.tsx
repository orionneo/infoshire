import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';

const isSafeNext = (next: string | null) => {
  if (!next) return false;
  return next.startsWith('/') && !next.startsWith('//') && !next.includes('http');
};

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      console.log('[AuthCallback] href:', window.location.href);
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const next = url.searchParams.get('next');
      const nextSafe = isSafeNext(next) ? next! : null;

      console.log('[AuthCallback] code?', !!code, 'next:', next);

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('[AuthCallback] exchangeCodeForSession error:', exchangeError);
          if (isActive) setError('Não foi possível concluir o login.');
          return;
        }
      }

      const waitForSession = async () => {
        for (let i = 1; i <= 5; i += 1) {
          const { data, error } = await supabase.auth.getSession();
          console.log('[AuthCallback] session attempt:', i, 'hasSession:', !!data?.session, 'err:', error ?? null);
          if (data?.session) return data.session;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return null;
      };

      const session = await waitForSession();
      if (!session) {
        if (isActive) setError('Sessão não encontrada.');
        return;
      }

      // Busca role (fonte de verdade) para decidir destino
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        // Não bloquear login por falha de profile (best-effort)
        console.warn('[AuthCallback] profile lookup failed:', profileError);
      }

      const role = profile?.role ?? null;

      const destination = nextSafe ? nextSafe : role === 'admin' ? '/admin' : '/client';
      console.log('[AuthCallback] redirecting to:', destination);
      window.location.replace(destination);
    };

    run().catch(() => {
      if (isActive) setError('Não foi possível concluir o login.');
    });

    return () => {
      isActive = false;
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>{error}</h2>
        <a href="/login">Voltar ao login</a>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Conectando...</h2>
    </div>
  );
}
