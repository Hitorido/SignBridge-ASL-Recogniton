import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const memoryStore: Record<string, string> = {};

/** Works on native, web client, and Expo static SSR (no `window`). */
export const authStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return memoryStore[key] ?? null;
      }
      return window.localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        memoryStore[key] = value;
        return;
      }
      window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        delete memoryStore[key];
        return;
      }
      window.localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

export function getSupabaseAuthStorageKey(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  const ref = match?.[1] ?? "signbridge";
  return `sb-${ref}-auth-token`;
}

export async function listAuthStorageKeys(): Promise<string[]> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return Object.keys(memoryStore).filter(
        (k) => k.startsWith("sb-") || k.includes("auth-token"),
      );
    }
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.includes("auth-token"))) {
        keys.push(k);
      }
    }
    return keys;
  }
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith("sb-") || k.includes("auth-token"));
}

export async function clearStaleAuth(): Promise<void> {
  const keys = await listAuthStorageKeys();
  await Promise.all(keys.map((k) => authStorage.removeItem(k)));
}

function parseStoredSession(raw: string): {
  expires_at?: number;
} | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const session =
      (parsed.currentSession as { expires_at?: number } | undefined) ??
      (parsed as { expires_at?: number });
    if (!session || typeof session !== "object") return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Remove expired sessions BEFORE Supabase client initializes.
 * Prevents getSession/__loadSession from calling _callRefreshToken (which logs AuthApiError).
 */
const AUTH_MIGRATION_KEY = "signbridge_auth_v3";

export async function purgeExpiredAuthFromStorage(): Promise<void> {
  const migrated = await authStorage.getItem(AUTH_MIGRATION_KEY);
  if (!migrated) {
    await clearStaleAuth();
    await authStorage.setItem(AUTH_MIGRATION_KEY, "1");
  }

  const keys = await listAuthStorageKeys();
  const nowSec = Math.floor(Date.now() / 1000);

  await Promise.all(
    keys.map(async (key) => {
      const raw = await authStorage.getItem(key);
      if (!raw) return;
      const session = parseStoredSession(raw);
      if (!session) {
        await authStorage.removeItem(key);
        return;
      }
      const expiresAt = session.expires_at ?? 0;
      if (expiresAt <= nowSec + 300) {
        await authStorage.removeItem(key);
        if (key.endsWith("-auth-token")) {
          await authStorage.removeItem(`${key}-user`);
        }
      }
    }),
  );
}

export async function readSessionFromStorage(): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: { id: string; email?: string };
} | null> {
  const raw = await authStorage.getItem(getSupabaseAuthStorageKey());
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const session =
      (parsed.currentSession as Record<string, unknown> | undefined) ??
      parsed;
    if (!session?.access_token || !session?.user) return null;
    return session as {
      access_token: string;
      refresh_token?: string;
      expires_at?: number;
      user: { id: string; email?: string };
    };
  } catch {
    return null;
  }
}
