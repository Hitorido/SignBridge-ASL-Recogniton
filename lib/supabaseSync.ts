import { supabase } from "../app/lib/supabase";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export async function pushChatMessageToSupabase(
  userId: string,
  message: ChatMessage,
) {
  await supabase.from("chat_messages").upsert({
    id: message.id,
    user_id: userId,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
  });
}

export async function fetchChatFromSupabase(
  userId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
  }));
}

export async function clearChatFromSupabase(userId: string) {
  await supabase.from("chat_messages").delete().eq("user_id", userId);
}
