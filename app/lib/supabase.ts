import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authStorage } from "../../lib/authStorage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

function createSupabase(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

let client: SupabaseClient | null = null;

/** Lazy singleton — created after purgeExpiredAuthFromStorage() in root layout. */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!client) {
      client = createSupabase();
    }
    const value = Reflect.get(client, prop, client);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

export default supabase;
