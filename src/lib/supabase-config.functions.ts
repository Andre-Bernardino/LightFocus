import { createServerFn } from "@tanstack/react-start";

/**
 * Expõe a configuração pública do Supabase externo do usuário.
 * A URL e a chave anon são públicas por natureza (a segurança fica no RLS),
 * mas ficam guardadas como secrets do projeto (SUPABASE_URL / SUPABASE_ANON_KEY)
 * e são lidas no servidor para o cliente do navegador poder se conectar.
 */
export const getSupabaseConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    const url =
      process.env["EXTERNAL_SUPABASE_URL"] ??
      process.env["VITE_SUPABASE_URL"] ??
      null;
    const anonKey =
      process.env["EXTERNAL_SUPABASE_ANON_KEY"] ??
      process.env["VITE_SUPABASE_ANON_KEY"] ??
      null;

    if (!url || !anonKey) return { url: null, anonKey: null };
    return { url, anonKey };
  },
);
