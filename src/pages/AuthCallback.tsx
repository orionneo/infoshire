import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const next = url.searchParams.get('next');
      const safeNext =
        next && next.startsWith('/') && !next.startsWith('//') && !next.includes('http');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          navigate('/login', { replace: true });
          return;
        }
      }

      navigate(safeNext ? next : '/', { replace: true });
    };

    run();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Finalizando login...</div>
    </div>
  );
}
