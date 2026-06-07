import { supabase } from "@/app/lib/supabase";

export type SessionRow = {
  id: string;
  user_id: string;
  signs_detected: string[];
  confidence_scores: number[];
  timestamp: string;
  duration_seconds: number;
};

/** Save a detection session */
export async function saveSession(
  userId: string,
  signsDetected: string[],
  confidenceScores: number[],
  durationSeconds: number,
): Promise<void> {
  await supabase.from("sessions").insert({
    user_id: userId,
    signs_detected: signsDetected,
    confidence_scores: confidenceScores,
    duration_seconds: durationSeconds,
  });
}

/** Get all sessions for a user */
export async function getSessions(userId: string): Promise<SessionRow[]> {
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(50);
  return data ?? [];
}
