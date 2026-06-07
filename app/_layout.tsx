import { bootstrapAuth } from "@/lib/authSession";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../globals.css";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    GallaudetRegular: require("../assets/fonts/GallaudetRegular.ttf"),
  });
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    bootstrapAuth().finally(() => setAuthReady(true));
  }, []);

  if (!fontsLoaded || !authReady) return null;

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
