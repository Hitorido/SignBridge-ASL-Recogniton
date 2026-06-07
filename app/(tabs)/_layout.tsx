import CustomTabBar from "@/components/CustomTabBar";
import { getValidSession } from "@/lib/authSession";
import type { Session } from "@supabase/supabase-js";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useState } from "react";
export default function TabLayout() {
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

  if (!session) {
    return <Redirect href={"/(auth)/Login" as any} />;
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="Home" options={{ title: "Home" }} />
      <Tabs.Screen name="Learn" options={{ title: "Learn" }} />
      <Tabs.Screen name="index" options={{ title: "Camera" }} />
      <Tabs.Screen name="AIScreen" options={{ title: "AI" }} />
      <Tabs.Screen name="Profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
