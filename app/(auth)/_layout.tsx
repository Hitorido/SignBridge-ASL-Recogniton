import { getValidSession } from "@/lib/authSession";
import type { Session } from "@supabase/supabase-js";
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
export default function AuthLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    getValidSession().then(({ session: s }) => {
      setSession(s);
      setLoading(false);
    });

    import("../lib/supabase").then(({ supabase }) => {
      const { data } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        setLoading(false);
      });
      subscription = data.subscription;
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 300,
      }}
    >
      <Stack.Screen name="Login" />
      <Stack.Screen name="Signup" />
    </Stack>
  );
}
