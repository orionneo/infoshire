
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const memory = new Map<string, string>();

const storage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {}
    try {
      return sessionStorage.getItem(key);
    } catch {}
    return memory.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {}
    try {
      sessionStorage.setItem(key, value);
      return;
    } catch {}
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {}
    try {
      sessionStorage.removeItem(key);
    } catch {}
    memory.delete(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storage,
  },
});
            
