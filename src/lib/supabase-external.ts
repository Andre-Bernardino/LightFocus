import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./supabase-config.functions";

// Cliente para o Supabase EXTERNO do usuário (não usa Lovable Cloud).
// A URL e a chave anon são lidas dos secrets do projeto
// (EXTERNAL_SUPABASE_URL / EXTERNAL_SUPABASE_ANON_KEY) via server function,
// com fallback para variáveis VITE_ no ambiente local.

const envUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const envAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

let clientPromise: Promise<SupabaseClient | null> | null = null;

function make(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      // Sessão persistida para o login funcionar entre recarregamentos.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/** Retorna o cliente configurado, ou null quando não há credenciais. */
export function getSupabaseExternal(): Promise<SupabaseClient | null> {
  if (clientPromise) return clientPromise;

  if (envUrl && envAnonKey) {
    clientPromise = Promise.resolve(make(envUrl, envAnonKey));
    return clientPromise;
  }

  clientPromise = (async () => {
    try {
      const cfg = await getSupabaseConfig();
      if (!cfg?.url || !cfg?.anonKey) return null;
      return make(cfg.url, cfg.anonKey);
    } catch (e) {
      console.error("Supabase config:", e);
      return null;
    }
  })();

  return clientPromise;
}
