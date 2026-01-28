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
    console.error('获取用户信息失败:', error);
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
  if (!digits) {
    return null;
  }
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  if (normalized.length === 12 || normalized.length === 13) {
    return normalized;
  }
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    const isAdminPath = window.location.pathname.startsWith('/admin');

    if (isAdminPath) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfile(session.user.id).then(setProfile);
        }
        setLoading(false);
      });
      // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfile(session.user.id).then(setProfile);
        } else {
          setProfile(null);
        }
      });

      return () => subscription.unsubscribe();
    }

    let pendingReadySignals = 2;
    let initialEventHandled = false;
    const markReady = () => {
      pendingReadySignals -= 1;
      if (pendingReadySignals <= 0) {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
      markReady();
    });
    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
      if (!initialEventHandled) {
        initialEventHandled = true;
        markReady();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      // Check if username is an email
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
      const email = `${username}@miaoda.com`;
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
      const email = data.email.trim();
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
      const user = authData.user ?? authData.session?.user;

      if (user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: user.id,
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
      // Usar canonical origin para evitar mistura de www/non-www
      const canonicalOrigin = window.location.origin;
      const redirectTo = `${canonicalOrigin}/auth/callback?next=/client`;

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
    const displayName = (oauthUser.user_metadata?.name
      || oauthUser.user_metadata?.full_name
      || '').trim();
    const existingProfile = await getProfile(oauthUser.id);
    const existingPhone = existingProfile?.phone ?? null;

    const { error } = await supabase.from('profiles').upsert({
      id: oauthUser.id,
      email: normalizedEmail,
      name: displayName,
      role: 'client',
      phone: existingPhone,
    }, { onConflict: 'id' });

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
    <AuthContext.Provider value={{ user, profile, loading, signInWithUsername, signUpWithUsername, signUpWithEmail, signInWithGoogle, signOut, refreshProfile, ensureProfileForOAuthUser }}>
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
