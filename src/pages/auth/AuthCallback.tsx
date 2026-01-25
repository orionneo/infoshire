import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { code, next } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      code: params.get('code'),
      next: params.get('next') || '/client',
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!code) {
        setError('Código de autenticação ausente. Tente novamente.');
        return;
      }
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Sessão não encontrada após autenticação.');
        }
        // Limpa querystring
        window.history.replaceState({}, '', '/auth/callback');
        navigate(next, { replace: true });
      } catch (err) {
        // Não bloqueia, mas mostra erro
        console.error('Falha ao finalizar login:', err);
        setError('Não foi possível finalizar o login. Tente novamente.');
      }
    };
    run();
  }, [code, next, navigate]);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Finalizando login...</h2>
      <p>Por favor, aguarde. Se não for redirecionado, tente novamente.</p>
      {error ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#b00020', marginBottom: 12 }}>{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            style={{ padding: '8px 16px', borderRadius: 6 }}
          >
            Voltar para login
          </button>
        </div>
      ) : null}
    </div>
  );
}
