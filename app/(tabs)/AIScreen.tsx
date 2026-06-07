import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  clearChatFromSupabase,
  fetchChatFromSupabase,
  pushChatMessageToSupabase,
} from "../../lib/supabaseSync";
import { getValidSession } from "../../lib/authSession";
import { supabase } from "../lib/supabase";

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

const chatKey = (userId: string) => `chat_history_${userId}`;

export default function AIScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // ── Get current user ────────────────────────────────────────────────────
  useEffect(() => {
    getValidSession().then(({ session }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // ── Load chat history ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(chatKey(userId));
        if (stored) {
          const parsed: Message[] = JSON.parse(stored);
          setMessages(parsed);
          if (parsed.length > 0) setShowWelcome(false);
        } else {
          const remote = await fetchChatFromSupabase(userId);
          if (remote.length > 0) {
            setMessages(remote);
            setShowWelcome(false);
            AsyncStorage.setItem(chatKey(userId), JSON.stringify(remote));
          }
        }
      } catch (e) {
        console.warn("Failed to load chat history", e);
      }
    })();
  }, [userId]);

  // ── Persist on change ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || messages.length === 0) return;
    AsyncStorage.setItem(chatKey(userId), JSON.stringify(messages)).catch(
      () => {},
    );
  }, [messages, userId]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!GEMINI_API_KEY) {
      Alert.alert(
        "Missing API Key",
        "Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.",
      );
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowWelcome(false);
    Keyboard.dismiss();

    try {
      const systemPrompt = `You are a helpful AI assistant for SignBridge, a sign language app. Help users with sign language questions, learning tips, or general assistance. Be concise and encouraging.`;
      const prompt = `${systemPrompt}\n\nUser: ${userMessage.content}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid response from Gemini");
      }

      if (!response.ok)
        throw new Error(
          `API error: ${data?.error?.message || response.statusText}`,
        );

      const aiContent =
        data.candidates?.[0]?.content?.parts?.[0]?.text ??
        "Sorry, no response.";

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiContent
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/<[^>]*>/g, "")
          .trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (userId) {
        pushChatMessageToSupabase(userId, userMessage);
        pushChatMessageToSupabase(userId, aiMessage);
      }
    } catch (error: any) {
      const errorMsg = error.message?.includes("key")
        ? "API key issue. Check your .env file."
        : error.message;
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Oops: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    Alert.alert("Clear Chat", "Delete all messages?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setMessages([]);
          setShowWelcome(true);
          if (userId) {
            AsyncStorage.removeItem(chatKey(userId)).catch(() => {});
            clearChatFromSupabase(userId);
          }
        },
      },
    ]);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // ── Render message ──────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userRow : styles.aiRow,
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <MaterialIcons name="smart-toy" size={20} color="#00d9ff" />
          </View>
        )}
        <View
          style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? "#0a0e27" : "#e0e0e0" },
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.timestamp,
              {
                color: isUser ? "rgba(10,14,39,0.6)" : "rgba(255,255,255,0.45)",
              },
            ]}
          >
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#0a0e27", "#0d1540"]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.bottom + 80}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>AI Helper</Text>
          <TouchableOpacity onPress={clearChat} style={styles.headerBtn}>
            <MaterialIcons name="delete-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />

        {/* Welcome state */}
        {showWelcome && messages.length === 0 && (
          <View style={styles.welcome}>
            <MaterialIcons name="smart-toy" size={52} color="#00d9ff" />
            <Text style={styles.welcomeTitle}>AI Helper</Text>
            <Text style={styles.welcomeSub}>
              Ask me anything about sign language!
            </Text>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask AI for help..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { opacity: !input.trim() || isLoading ? 0.5 : 1 },
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  headerBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  list: { flex: 1, paddingHorizontal: 16 },
  listContent: { paddingVertical: 16, flexGrow: 1 },
  messageContainer: { flexDirection: "row", marginVertical: 4 },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start", alignItems: "flex-end" },
  aiAvatar: { marginRight: 8, marginBottom: 4 },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  userBubble: {
    backgroundColor: "#00d9ff",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.15)",
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 21 },
  timestamp: { fontSize: 11, marginTop: 4, textAlign: "right" },
  welcome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 14,
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 15,
    textAlign: "center",
    color: "rgba(255,255,255,0.65)",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 80,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 15,
    maxHeight: 120,
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#FFFFFF",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00d9ff",
  },
});
