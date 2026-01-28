import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        const currentUrl = window.location.href;
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const rawNext = params.get('next');
        const isSafeNext = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('http');
        const next = isSafeNext ? rawNext : null;
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);

        const authWithUrl = supabase.auth as typeof supabase.auth & {
          getSessionFromUrl?: (options?: { storeSession?: boolean }) => Promise<{ error: unknown }>;
        };

        if (typeof authWithUrl.getSessionFromUrl === 'function') {
          const { error: exchangeError } = await authWithUrl.getSessionFromUrl({ storeSession: true });
          if (exchangeError) {
            throw exchangeError;
          }
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        } else {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(currentUrl);
          if (exchangeError) {
            console.warn('Código de autenticação ausente ou inválido.', exchangeError);
            navigate('/login', { replace: true });
            return;
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user ?? null;
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const user = sessionUser ?? userData.user ?? null;
        if (userError || !user) {
          console.error('Usuário não encontrado após autenticação.', userError);
          navigate('/login', { replace: true });
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
          navigate(next, { replace: true });
          return;
        }
        if (profile?.role === 'admin') {
          navigate('/admin', { replace: true });
          return;
        }
        if (!profile?.phone) {
          navigate('/complete-profile', { replace: true });
          return;
        }
        navigate('/client', { replace: true });
      } catch (err) {
        console.error('Falha ao finalizar login:', err);
        navigate('/login', { replace: true });
      }
    };
    run();
  }, [navigate]);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Finalizando login...</h2>
      <p>Por favor, aguarde. Se não for redirecionado, tente novamente.</p>
    </div>
  );
}
