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
        const rawNext = params.get('next') || '/client';
        const isSafeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('http');
        const next = isSafeNext ? rawNext : '/client';
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);

        if (code) {
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

        if (profile?.role === 'admin') {
          navigate('/admin', { replace: true });
          return;
        }
        if (!profile?.phone) {
          navigate('/complete-profile', { replace: true });
          return;
        }
        navigate(next, { replace: true });
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
