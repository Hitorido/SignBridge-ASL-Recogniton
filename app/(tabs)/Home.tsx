import { supabase } from "@/app/lib/supabase";
import { getValidSession } from "@/lib/authSession";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_SIGNS = ["A", "B", "C", "D", "E", "F"];

const TIPS = [
  "Hold your hand steady inside the reticle for best results.",
  "Good lighting improves detection accuracy significantly.",
  "Keep your hand at a comfortable distance from the camera.",
  "Practice each letter in the Learn tab before scanning.",
  "A plain background helps the model detect your hand better.",
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]!);

  useEffect(() => {
    (async () => {
      const { session } = await getValidSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single();
      setUsername(data?.username ?? null);
    })();
  }, []);

  return (
    <LinearGradient colors={["#0a0e27", "#0d1540"]} style={styles.container}>
      {/* Glow orb */}
      <View style={styles.orb} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetSub}>Welcome back,</Text>
          <Text style={styles.greetName}>{username ?? "Signer"} 👋</Text>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>QUICK ACCESS</Text>
        <View style={styles.quickRow}>
          <QuickCard
            icon="photo-camera"
            label="Scan Sign"
            color="#00d9ff"
            onPress={() => router.push("/(tabs)" as any)}
          />
          <QuickCard
            icon="school"
            label="Learn ASL"
            color="#b4bbff"
            onPress={() => router.push("/(tabs)/Learn" as any)}
          />
          <QuickCard
            icon="smart-toy"
            label="Ask AI"
            color="#00d9ff"
            onPress={() => router.push("/(tabs)/AIScreen" as any)}
          />
        </View>

        {/* Daily tip */}
        <Text style={styles.sectionTitle}>TIP OF THE DAY</Text>
        <View style={styles.tipCard}>
          <MaterialIcons
            name="lightbulb"
            size={20}
            color="#ffd700"
            style={{ marginRight: 12 }}
          />
          <Text style={styles.tipText}>{tip}</Text>
        </View>

        {/* Quick sign preview */}
        <Text style={styles.sectionTitle}>QUICK SIGNS</Text>
        <View style={styles.signsRow}>
          {QUICK_SIGNS.map((letter) => (
            <TouchableOpacity
              key={letter}
              style={styles.signChip}
              onPress={() => router.push("/(tabs)/Learn" as any)}
            >
              <Text style={styles.signChipLetter}>{letter}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* About */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>About SignBridge</Text>
          <Text style={styles.aboutText}>
            SignBridge uses AI to detect American Sign Language (ASL) hand signs
            in real time. Point your camera at your hand, hold a sign steady,
            and the app will recognize it.
          </Text>
          <View style={styles.aboutStats}>
            <Stat value="26" label="Letters" />
            <View style={styles.statDivider} />
            <Stat value="AI" label="Powered" />
            <View style={styles.statDivider} />
            <Stat value="Real-time" label="Detection" />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function QuickCard({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.quickCard}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.quickIcon,
          { borderColor: color + "40", backgroundColor: color + "15" },
        ]}
      >
        <MaterialIcons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(0,217,255,0.05)",
    top: -60,
    alignSelf: "center",
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24 },
  greeting: { marginBottom: 28 },
  greetSub: { color: "#b0b0b0", fontSize: 14 },
  greetName: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionTitle: {
    color: "#b0b0b0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  quickCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.1)",
    paddingVertical: 16,
    gap: 8,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLabel: {
    color: "#e0e0e0",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,215,0,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
    padding: 16,
    marginBottom: 28,
  },
  tipText: { color: "#e0e0e0", fontSize: 13, lineHeight: 20, flex: 1 },
  signsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  signChip: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(0,217,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  signChipLetter: { color: "#00d9ff", fontSize: 20, fontWeight: "800" },
  aboutCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.1)",
    padding: 20,
  },
  aboutTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  aboutText: {
    color: "#b0b0b0",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  stat: { alignItems: "center" },
  statValue: { color: "#00d9ff", fontSize: 16, fontWeight: "800" },
  statLabel: { color: "#b0b0b0", fontSize: 11, marginTop: 2 },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(0,217,255,0.15)",
  },
});
