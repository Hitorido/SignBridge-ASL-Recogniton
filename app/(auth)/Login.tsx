import AURAButton from "@/components/AURAButton";
import AuraInput from "@/components/AuraInput";
import AuraLogo from "@/components/AuraLogo";
import BackgroundAura from "@/components/BackgroundAura";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", username.trim().toLowerCase())
      .single();

    if (profileError || !profile?.email) {
      Alert.alert("Error", "Username not found.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      router.replace("/(tabs)");
    }
    setLoading(false);
  };

  return (
    <BackgroundAura>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <AuraLogo />

          <View style={styles.card}>
            <Text style={styles.subtitle}>
              Securely access your sign language workflow with a precision-grade
              interface.
            </Text>

            <AuraInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <AuraInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <AURAButton title="Login" onPress={handleLogin} loading={loading} />

            <TouchableOpacity
              onPress={() => router.push("/(auth)/Signup" as any)}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>
                Don't have an account?{" "}
                <Text style={styles.linkAccent}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundAura>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0a0e27",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 32,
  },
  subtitle: {
    color: "#b0b0b0",
    textAlign: "center",
    marginBottom: 28,
    fontSize: 13,
    lineHeight: 20,
  },
  linkRow: {
    marginTop: 24,
  },
  linkText: {
    color: "#b0b0b0",
    textAlign: "center",
    fontSize: 13,
  },
  linkAccent: {
    color: "#00d9ff",
  },
});
