import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/db/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const next = params.get('next') || '/client';
      if (!code) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
        // Limpa querystring
        window.history.replaceState({}, '', '/auth/callback');
        navigate(next, { replace: true });
      } catch (err) {
        // Não bloqueia, mas mostra erro
        navigate('/login', { replace: true });
      }
    };
    run();
  }, [navigate, location]);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Finalizando login...</h2>
      <p>Por favor, aguarde. Se não for redirecionado, tente novamente.</p>
    </div>
  );
}
