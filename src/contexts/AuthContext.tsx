import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Employee } from '../types/db';

interface AuthContextValue {
  user: User | null;
  profile: Employee | null;
  session: Session | null;
  loading: boolean;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  signUp: (params: { email: string; password: string; name: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // ── session init ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (!error) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // ── fetch employee profile whenever user changes ──────────
  useEffect(() => {
    if (!user) { setProfile(null); return; }

    supabase
      .from('employees')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading profile:', error.message);
        } else {
          setProfile(data as Employee);
        }
      });
  }, [user]);

  // ── auth actions ──────────────────────────────────────────
  const signIn = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async ({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name: string;
  }) => {
    // Pass name in metadata so the DB trigger (handle_new_user) can use it
    // to populate employees.name automatically — no client-side insert needed.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },          // stored in auth.users.raw_user_meta_data
      },
    });
    if (error) throw error;
    // The trigger handle_new_user() fires server-side and inserts the employees row.
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
