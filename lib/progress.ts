import { supabase } from "@/app/lib/supabase";

export type ProgressRow = {
  id: string;
  user_id: string;
  sign: string;
  sign_type: "letter" | "word";
  attempts: number;
  correct: number;
  last_practiced: string;
};

/** Record a detection attempt */
export async function recordAttempt(
  userId: string,
  sign: string,
  signType: "letter" | "word",
  wasCorrect: boolean,
) {
  const { data: existing } = await supabase
    .from("progress")
    .select("id, attempts, correct")
    .eq("user_id", userId)
    .eq("sign", sign)
    .single();

  if (existing) {
    await supabase
      .from("progress")
      .update({
        attempts: existing.attempts + 1,
        correct: existing.correct + (wasCorrect ? 1 : 0),
        last_practiced: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("progress").insert({
      user_id: userId,
      sign,
      sign_type: signType,
      attempts: 1,
      correct: wasCorrect ? 1 : 0,
    });
  }
}

/** Get all progress for a user */
export async function getProgress(userId: string): Promise<ProgressRow[]> {
  const { data } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", userId)
    .order("last_practiced", { ascending: false });
  return data ?? [];
}

/** Get accuracy % for a specific sign */
export function getAccuracy(row: ProgressRow): number {
  if (row.attempts === 0) return 0;
  return Math.round((row.correct / row.attempts) * 100);
}
