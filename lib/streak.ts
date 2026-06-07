import { supabase } from "@/app/lib/supabase";

export type StreakRow = {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string;
};

/** Get or create streak record for a user */
export async function getStreak(userId: string): Promise<StreakRow | null> {
  const { data } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

/** Update streak after a practice session */
export async function updateStreak(userId: string): Promise<number> {
  const streak = await getStreak(userId);
  const today = new Date().toISOString().split('T')[0];
  
  if (!streak) {
    // First practice ever
    await supabase.from("streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_practice_date: today,
    });
    return 1;
  }

  const lastPractice = new Date(streak.last_practice_date);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastPractice.getTime()) / (1000 * 60 * 60 * 24));

  let newCurrentStreak = streak.current_streak;
  let newLongestStreak = streak.longest_streak;

  if (diffDays === 0) {
    // Already practiced today, no change
    return streak.current_streak;
  } else if (diffDays === 1) {
    // Consecutive day
    newCurrentStreak = streak.current_streak + 1;
    newLongestStreak = Math.max(newCurrentStreak, streak.longest_streak);
  } else {
    // Streak broken
    newCurrentStreak = 1;
  }

  await supabase
    .from("streaks")
    .update({
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_practice_date: today,
    })
    .eq("id", streak.id);

  return newCurrentStreak;
}
