import type { User } from '@supabase/supabase-js';
import React, { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import type { Profile } from '@/types/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
  return data;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (data: { name: string; phone: string; email: string; password: string }) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  ensureProfileForOAuthUser: (oauthUser: User) => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const normalizeBrazilPhoneToWaDigits = (input: string): string | null => {
  const digits = input.replace(/\D/g, '');
  if (!digits) return null;

  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  if (normalized.length === 12 || normalized.length === 13) return normalized;

  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const processAuthRedirect = async () => {
    const url = new URL(window.location.href);
    const hasAuthHash = url.hash.includes('access_token=');
    const hasCode = url.searchParams.has('code');

    if (!hasAuthHash && !hasCode) {
      return false;
    }

    const authWithUrl = supabase.auth as typeof supabase.auth & {
      getSessionFromUrl?: (options?: { storeSession?: boolean }) => Promise<{ error: unknown }>;
    };

    const clearUrl = () => {
      if (url.hash || url.searchParams.has('code') || url.searchParams.has('next')) {
        url.hash = '';
        url.searchParams.delete('code');
        url.searchParams.delete('next');
        window.history.replaceState(null, document.title, `${url.pathname}${url.search}`);
      }
    };

    if (typeof authWithUrl.getSessionFromUrl === 'function') {
      try {
        const { error } = await authWithUrl.getSessionFromUrl({ storeSession: true });
        if (error) {
          console.warn('Auth redirect session failed:', error);
          return false;
        }
        clearUrl();
        return true;
      } catch (error) {
        console.warn('Auth redirect session failed:', error);
        return false;
      }
    }

    // Fallback manual (implicit flow hash tokens)
    if (hasAuthHash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        return false;
      }

      try {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          console.warn('Auth redirect session failed:', error);
          return false;
        }
        clearUrl();
        return true;
      } catch (error) {
        console.warn('Auth redirect session failed:', error);
        return false;
      }
    }

    // Fallback PKCE (code)
    const code = url.searchParams.get('code');
    if (!code) {
      return false;
    }

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn('Auth redirect session failed:', error);
        return false;
      }
      clearUrl();
      return true;
    } catch (error) {
      console.warn('Auth redirect session failed:', error);
      return false;
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        await processAuthRedirect();
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          const profileData = await getProfile(session.user.id);
          if (!isMounted) return;
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const normalizedUsername = username.trim();
      const isEmail = normalizedUsername.includes('@');
      const email = isEmail ? normalizedUsername.toLowerCase() : `${normalizedUsername}@miaoda.com`;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, password: string) => {
    try {
      const normalizedUsername = username.trim();
      const isEmail = normalizedUsername.includes('@');
      const email = isEmail ? normalizedUsername.toLowerCase() : `${normalizedUsername}@miaoda.com`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithEmail = async (data: { name: string; phone: string; email: string; password: string }) => {
    try {
      const name = data.name.trim();
      const phoneInput = data.phone.trim();
      const email = data.email.trim().toLowerCase();
      const normalizedPhone = normalizeBrazilPhoneToWaDigits(phoneInput);

      if (!normalizedPhone) {
        return { error: new Error('Informe DDD + número (ex: 19 99798-8952).') };
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          data: {
            name,
            phone: normalizedPhone,
          },
        },
      });

      if (error) throw error;

      const createdUser = authData.user ?? authData.session?.user;

      if (createdUser) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: createdUser.id,
          email,
          name,
          phone: normalizedPhone,
          role: 'client',
        });

        if (profileError) {
          console.warn('Profile upsert failed:', profileError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Use canonical origin to avoid mixing www/non-www
      const canonicalOrigin = 'https://infoshire.com.br';
      const searchParams = new URLSearchParams(window.location.search);
      const rawNext = searchParams.get('next');
      const isSafeNext = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('http');
      const redirectTo = isSafeNext
        ? `${canonicalOrigin}/auth/callback?next=${encodeURIComponent(rawNext)}`
        : `${canonicalOrigin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const ensureProfileForOAuthUser = async (oauthUser: User): Promise<Profile | null> => {
    const normalizedEmail = (oauthUser.email ?? '').trim().toLowerCase();
    const displayName = (oauthUser.user_metadata?.name || oauthUser.user_metadata?.full_name || '').trim();

    const existingProfile = await getProfile(oauthUser.id);
    const existingPhone = existingProfile?.phone ?? null;

    const { error } = await supabase.from('profiles').upsert(
      {
        id: oauthUser.id,
        email: normalizedEmail,
        name: displayName,
        role: 'client',
        phone: existingPhone,
      },
      { onConflict: 'id' },
    );

    if (error) {
      console.warn('Profile upsert failed:', error);
    }

    const profileData = await getProfile(oauthUser.id);
    setProfile(profileData);
    return profileData;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithUsername,
        signUpWithUsername,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        refreshProfile,
        ensureProfileForOAuthUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
