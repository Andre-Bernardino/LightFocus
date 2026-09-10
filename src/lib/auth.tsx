import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getSupabaseExternal } from "./supabase-external";

interface AuthContextValue {
  /** true quando o app tem banco configurado (login disponível). */
  configured: boolean;
  loading: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const db = await getSupabaseExternal();
      if (cancelled) return;

      if (!db) {
        setConfigured(false);
        setLoading(false);
        return;
      }

      setConfigured(true);

      const { data: sub } = db.auth.onAuthStateChange(
        (_event: string, session: Session | null) => {
          setUser(session?.user ?? null);
        },
      );
      unsubscribe = () => sub.subscription.unsubscribe();

      const { data } = await db.auth.getSession();
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const db = await getSupabaseExternal();
    if (!db) throw new Error("Banco de dados não configurado.");
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const db = await getSupabaseExternal();
    if (!db) throw new Error("Banco de dados não configurado.");
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth?confirmado=1` },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const db = await getSupabaseExternal();
    if (!db) throw new Error("Banco de dados não configurado.");
    const { error } = await db.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth?confirmado=1` },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const db = await getSupabaseExternal();
    await db?.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ configured, loading, user, signIn, signUp, resendConfirmation, signOut }),
    [configured, loading, user, signIn, signUp, resendConfirmation, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve estar dentro do AuthProvider");
  return ctx;
}
