import type { Session } from "@supabase/supabase-js";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { clearStaleAuth, getValidSession } from "../lib/authSession";
import SplashScreen from "./SplashScreen";

export default function RootIndex() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | undefined;

    (async () => {
      const { session: initial } = await getValidSession();
      if (!mounted) return;
      setSession(initial);
      setLoading(false);

      const { supabase } = await import("./lib/supabase");
      const { data } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        if (!mounted) return;

        if (event === "TOKEN_REFRESHED" && !nextSession) {
          await clearStaleAuth();
          setSession(null);
        } else if (event === "SIGNED_OUT") {
          setSession(null);
        } else if (nextSession) {
          const now = Math.floor(Date.now() / 1000);
          const exp = nextSession.expires_at ?? 0;
          if (exp <= now + 60) {
            await clearStaleAuth();
            setSession(null);
          } else {
            setSession(nextSession);
          }
        } else {
          setSession(null);
        }
        setLoading(false);
      });
      subscription = data.subscription;
    })();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/Login" />;
  }

  return <Redirect href="/(tabs)" />;
};
