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

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.trim().toLowerCase())
      .single();

    if (existing) {
      Alert.alert("Error", "Username is already taken.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
      });
    }

    Alert.alert("Success", "Check your email for verification.");
    router.push("/(auth)/Login" as any);
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
              Create your secure access and join the SignBridge experience.
            </Text>

            <AuraInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <AuraInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuraInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <AURAButton
              title="Sign up"
              onPress={handleSignup}
              loading={loading}
            />

            <TouchableOpacity
              onPress={() => router.push("/(auth)/Login" as any)}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>
                Already have an account?{" "}
                <Text style={styles.linkAccent}>Login</Text>
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
