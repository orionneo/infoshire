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
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const next = url.searchParams.get('next');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (isActive) setError('Não foi possível concluir o login.');
          return;
        }
      } else {
        const { error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (isActive) setError('Não foi possível concluir o login.');
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (isActive) setError('Sessão não encontrada.');
        return;
      }

      if (isSafeNext(next)) {
        window.location.replace(next ?? '/');
        return;
      }

      window.location.replace('/');
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
