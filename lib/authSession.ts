import type { Session } from "@supabase/supabase-js";
import {
  clearStaleAuth,
  purgeExpiredAuthFromStorage,
  readSessionFromStorage,
} from "./authStorage";

/** Call from root layout before any screen imports the Supabase client. */
export async function bootstrapAuth(): Promise<void> {
  await purgeExpiredAuthFromStorage();
}

/**
 * Read session from local storage only — never triggers refresh network calls.
 */
export async function getValidSession(): Promise<{ session: Session | null }> {
  const session = await readSessionFromStorage();
  if (!session) {
    return { session: null };
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt <= now + 60) {
    await clearStaleAuth();
    return { session: null };
  }

  return { session: session as Session };
}

export { clearStaleAuth, purgeExpiredAuthFromStorage };
