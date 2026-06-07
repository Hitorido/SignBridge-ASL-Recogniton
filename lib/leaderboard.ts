import { supabase } from "@/app/lib/supabase";

export type LeaderboardEntry = {
  user_id: string;
  username: string | null;
  total_attempts: number;
  total_correct: number;
  accuracy: number;
  rank: number;
};

/** Get leaderboard sorted by accuracy */
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("progress")
    .select("user_id, attempts, correct")
    .order("correct", { ascending: false });

  if (error || !data) return [];

  // Aggregate by user
  const userStats = new Map<string, { attempts: number; correct: number }>();
  for (const row of data) {
    const existing = userStats.get(row.user_id) || { attempts: 0, correct: 0 };
    userStats.set(row.user_id, {
      attempts: existing.attempts + row.attempts,
      correct: existing.correct + row.correct,
    });
  }

  // Convert to array and calculate accuracy
  let entries: LeaderboardEntry[] = [];
  let rank = 1;
  for (const [userId, stats] of userStats.entries()) {
    const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;
    entries.push({
      user_id: userId,
      username: null, // Will be filled from auth.users
      total_attempts: stats.attempts,
      total_correct: stats.correct,
      accuracy,
      rank: rank++,
    });
  }

  // Sort by accuracy, then by correct count
  entries.sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.total_correct - a.total_correct;
  });

  // Re-assign ranks
  entries = entries.map((entry, index) => ({ ...entry, rank: index + 1 }));

  // Get usernames from auth.users (if accessible)
  // Note: This might require a separate view or function in Supabase
  // For now, we'll return without usernames

  return entries.slice(0, limit);
}

/** Get user's rank on leaderboard */
export async function getUserRank(userId: string): Promise<number | null> {
  const leaderboard = await getLeaderboard(1000);
  const entry = leaderboard.find((e) => e.user_id === userId);
  return entry?.rank ?? null;
}
