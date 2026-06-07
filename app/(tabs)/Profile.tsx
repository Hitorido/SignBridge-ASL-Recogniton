import { supabase } from "@/app/lib/supabase";
import { getLeaderboard, LeaderboardEntry } from "@/lib/leaderboard";
import { getAccuracy, getProgress, ProgressRow } from "@/lib/progress";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleTestNotification } from "../../lib/notifications";
import { fetchChatFromSupabase } from "../../lib/supabaseSync";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"progress" | "history" | "leaderboard">(
    "progress",
  );

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        setEmail(session.user.email ?? null);
        setUserId(session.user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();

        setUsername(profile?.username ?? null);
        setLoading(false);

        // Load progress, chat history, and leaderboard in parallel
        const [msgs, prog, lb] = await Promise.all([
          fetchChatFromSupabase(session.user.id),
          getProgress(session.user.id),
          getLeaderboard(10),
        ]);
        setHistory(msgs);
        setProgress(prog);
        setLeaderboard(lb);

        // Subscribe to realtime updates for chat messages
        const chatSubscription = supabase
          .channel("chat_messages_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "chat_messages",
              filter: `user_id=eq.${session.user.id}`,
            },
            async () => {
              const updated = await fetchChatFromSupabase(session.user.id);
              setHistory(updated);
            }
          )
          .subscribe();

        // Subscribe to realtime updates for progress
        const progressSubscription = supabase
          .channel("progress_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "progress",
              filter: `user_id=eq.${session.user.id}`,
            },
            async () => {
              const [updatedProg, updatedLb] = await Promise.all([
                getProgress(session.user.id),
                getLeaderboard(10),
              ]);
              setProgress(updatedProg);
              setLeaderboard(updatedLb);
            }
          )
          .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
          chatSubscription.unsubscribe();
          progressSubscription.unsubscribe();
        };
      } catch (error: any) {
        console.warn("Auth error:", error.message);
        // Clear stale auth and redirect to login if refresh token is invalid
        if (error.message?.includes("Refresh Token")) {
          const { clearStaleAuth } = await import("../../lib/authSession");
          await clearStaleAuth();
          router.replace("/(auth)/Login" as any);
        }
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/Login" as any);
        },
      },
    ]);
  };

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : email
      ? email.slice(0, 2).toUpperCase()
      : "??";

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Summary stats
  const totalAttempts = progress.reduce((s, r) => s + r.attempts, 0);
  const totalCorrect = progress.reduce((s, r) => s + r.correct, 0);
  const overallAcc =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const letterProgress = progress.filter((r) => r.sign_type === "letter");
  const wordProgress = progress.filter((r) => r.sign_type === "word");

  return (
    <LinearGradient
      colors={["#0a0e27", "#0d1540"]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.orb} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={styles.username}>
          {loading ? "Loading..." : (username ?? "User")}
        </Text>
        <Text style={styles.email}>{email ?? ""}</Text>

        {/* Info card */}
        <View style={styles.card}>
          <Row icon="person-outline" label="Username" value={username ?? "—"} />
          <View style={styles.divider} />
          <Row icon="email" label="Email" value={email ?? "—"} />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={18} color="#ff4d6d" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Test notification button */}
        <TouchableOpacity
          style={styles.testNotificationBtn}
          onPress={() => {
            scheduleTestNotification().then(() => {
              Alert.alert("Test Notification", "Notification scheduled in 5 seconds!");
            }).catch(console.error);
          }}
        >
          <MaterialIcons name="notifications" size={18} color="#00d9ff" />
          <Text style={styles.testNotificationText}>Test Notification</Text>
        </TouchableOpacity>

        {/* Stats summary */}
        {totalAttempts > 0 && (
          <View style={styles.statsRow}>
            <StatBox value={totalAttempts.toString()} label="Attempts" />
            <StatBox value={`${overallAcc}%`} label="Accuracy" />
            <StatBox value={progress.length.toString()} label="Signs Tried" />
          </View>
        )}

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "progress" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("progress")}
          >
            <MaterialIcons
              name="bar-chart"
              size={14}
              color={activeTab === "progress" ? "#0a0e27" : "#00d9ff"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "progress" && { color: "#0a0e27" },
              ]}
            >
              Progress
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "history" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("history")}
          >
            <MaterialIcons
              name="history"
              size={14}
              color={activeTab === "history" ? "#0a0e27" : "#00d9ff"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "history" && { color: "#0a0e27" },
              ]}
            >
              Chat History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "leaderboard" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("leaderboard")}
          >
            <MaterialIcons
              name="emoji-events"
              size={14}
              color={activeTab === "leaderboard" ? "#0a0e27" : "#00d9ff"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "leaderboard" && { color: "#0a0e27" },
              ]}
            >
              Leaderboard
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress tab */}
        {activeTab === "progress" && (
          <View style={styles.sectionBox}>
            {progress.length === 0 ? (
              <Text style={styles.emptyText}>
                No practice data yet.{"\n"}Start scanning signs to track
                progress!
              </Text>
            ) : (
              <>
                {letterProgress.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>LETTERS</Text>
                    {letterProgress.map((row) => (
                      <ProgressItem key={row.id} row={row} />
                    ))}
                  </>
                )}
                {wordProgress.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                      WORDS
                    </Text>
                    {wordProgress.map((row) => (
                      <ProgressItem key={row.id} row={row} />
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* History tab */}
        {activeTab === "history" && (
          <View style={styles.sectionBox}>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>No chat history yet.</Text>
            ) : (
              history.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.historyBubble,
                    msg.role === "user" ? styles.historyUser : styles.historyAI,
                  ]}
                >
                  <Text style={styles.historyRole}>
                    {msg.role === "user" ? "You" : "AI"}
                  </Text>
                  <Text style={styles.historyContent} numberOfLines={3}>
                    {msg.content}
                  </Text>
                  <Text style={styles.historyTime}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Leaderboard tab */}
        {activeTab === "leaderboard" && (
          <View style={styles.sectionBox}>
            {leaderboard.length === 0 ? (
              <Text style={styles.emptyText}>No leaderboard data yet.</Text>
            ) : (
              leaderboard.map((entry) => (
                <View key={entry.user_id} style={styles.leaderboardRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{entry.rank}</Text>
                  </View>
                  <View style={styles.leaderboardInfo}>
                    <Text style={styles.leaderboardUsername}>
                      {entry.username || "Anonymous"}
                    </Text>
                    <Text style={styles.leaderboardStats}>
                      {entry.accuracy}% accuracy • {entry.total_correct}/{entry.total_attempts} correct
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <MaterialIcons
        name={icon}
        size={18}
        color="#00d9ff"
        style={{ marginRight: 12 }}
      />
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressItem({ row }: { row: ProgressRow }) {
  const acc = getAccuracy(row);
  const barColor = acc >= 70 ? "#00d9ff" : acc >= 40 ? "#ffd700" : "#ff4d6d";
  return (
    <View style={styles.progressItem}>
      <View style={styles.progressLeft}>
        <Text style={styles.progressSign}>{row.sign.toUpperCase()}</Text>
        <Text style={styles.progressMeta}>{row.attempts} attempts</Text>
      </View>
      <View style={styles.progressRight}>
        <Text style={[styles.progressAcc, { color: barColor }]}>{acc}%</Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${acc}%` as any, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(0,217,255,0.05)",
    top: 40,
    alignSelf: "center",
  },
  scroll: { flex: 1 },
  content: { alignItems: "center", paddingHorizontal: 24, paddingTop: 48 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "rgba(0,217,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#00d9ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,217,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#00d9ff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 2,
  },
  username: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  email: { color: "#b0b0b0", fontSize: 13, marginBottom: 32 },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 8,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,217,255,0.08)",
    marginHorizontal: 20,
  },
  rowLabel: {
    color: "#b0b0b0",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  rowValue: { color: "#ffffff", fontSize: 15, fontWeight: "500" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,77,109,0.3)",
    backgroundColor: "rgba(255,77,109,0.08)",
    marginBottom: 24,
  },
  signOutText: {
    color: "#ff4d6d",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  testNotificationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.3)",
    backgroundColor: "rgba(0,217,255,0.08)",
    marginBottom: 24,
  },
  testNotificationText: {
    color: "#00d9ff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20, width: "100%" },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(0,217,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.15)",
    padding: 14,
    alignItems: "center",
  },
  statValue: { color: "#00d9ff", fontSize: 20, fontWeight: "800" },
  statLabel: {
    color: "#b0b0b0",
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 16, width: "100%" },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.2)",
    backgroundColor: "rgba(0,217,255,0.06)",
  },
  tabBtnActive: { backgroundColor: "#00d9ff", borderColor: "#00d9ff" },
  tabBtnText: { color: "#00d9ff", fontSize: 12, fontWeight: "600" },
  sectionBox: { width: "100%" },
  sectionLabel: {
    color: "#b0b0b0",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  emptyText: {
    color: "#b0b0b0",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.08)",
    padding: 12,
    marginBottom: 8,
  },
  progressLeft: { flex: 1 },
  progressSign: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  progressMeta: { color: "#b0b0b0", fontSize: 11, marginTop: 2 },
  progressRight: { alignItems: "flex-end", minWidth: 80 },
  progressAcc: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  progressBarBg: {
    width: 72,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 2 },
  historyBubble: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  historyUser: {
    backgroundColor: "rgba(0,217,255,0.08)",
    borderColor: "rgba(0,217,255,0.2)",
  },
  historyAI: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  historyRole: {
    color: "#00d9ff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  historyContent: { color: "#e0e0e0", fontSize: 13, lineHeight: 19 },
  historyTime: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    marginTop: 6,
    textAlign: "right",
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.08)",
    padding: 12,
    marginBottom: 8,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,215,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    color: "#ffd700",
    fontSize: 14,
    fontWeight: "800",
  },
  leaderboardInfo: { flex: 1 },
  leaderboardUsername: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  leaderboardStats: {
    color: "#b0b0b0",
    fontSize: 11,
  },
});
