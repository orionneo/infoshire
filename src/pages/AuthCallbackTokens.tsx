import { useEffect, useRef } from 'react';
import { supabase } from '@/db/supabase';

export default function AuthCallbackTokens() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) {
      return;
    }
    ran.current = true;

    const run = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      if (!access_token || !refresh_token) {
        window.location.replace('/login?error=missing_tokens');
        return;
      }

      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.error('[AuthCallbackTokens] setSession error', error);
        window.location.replace('/login?error=oauth_setsession_failed');
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname);

      const { data: s } = await supabase.auth.getSession();
      const userId = s.session?.user?.id;
      if (!userId) {
        window.location.replace('/login?error=session_missing');
        return;
      }

      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, phone')
        .eq('id', userId)
        .maybeSingle();

      if (!profile && !profileError) {
        const fallback = await supabase
          .from('profiles')
          .select('role, phone')
          .eq('user_id', userId)
          .maybeSingle();
        profile = fallback.data;
        profileError = fallback.error;
      }

      if (profileError) {
        console.error('[AuthCallbackTokens] profile fetch error', profileError);
      }

      const destination =
        profile?.role === 'admin' ? '/admin' : !profile?.phone ? '/complete-profile' : '/client';
      window.location.replace(destination);
    };

    run().catch((error) => {
      console.error('[AuthCallbackTokens] fatal', error);
      window.location.replace('/login?error=oauth_callback_failed');
    });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Finalizando login...</div>
    </div>
  );
}
