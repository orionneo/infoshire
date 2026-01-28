import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { ensureProfileForOAuthUser } = useAuth();
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
        const profileData = await ensureProfileForOAuthUser(session.user);
        // Limpa querystring
        window.history.replaceState({}, '', '/auth/callback');
        if (profileData?.role === 'admin') {
          navigate('/admin', { replace: true });
          return;
        }
        if (!profileData?.phone) {
          navigate('/complete-profile', { replace: true });
          return;
        }
        navigate(next, { replace: true });
      } catch (err) {
        // Não bloqueia, mas mostra erro
        console.error('Falha ao finalizar login:', err);
        setError('Não foi possível finalizar o login. Tente novamente.');
      }
    };
    run();
  }, [code, next, navigate, ensureProfileForOAuthUser]);

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
