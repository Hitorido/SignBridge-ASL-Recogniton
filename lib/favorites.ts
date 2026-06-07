import { supabase } from "@/app/lib/supabase";

export type FavoriteRow = {
  id: string;
  user_id: string;
  sign: string;
  sign_type: "letter" | "word";
  created_at: string;
};

/** Toggle a favorite (add if not exists, remove if exists) */
export async function toggleFavorite(
  userId: string,
  sign: string,
  signType: "letter" | "word",
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("sign", sign)
    .eq("sign_type", signType)
    .single();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    return false; // Removed
  } else {
    await supabase.from("favorites").insert({
      user_id: userId,
      sign,
      sign_type: signType,
    });
    return true; // Added
  }
}

/** Check if a sign is favorited */
export async function isFavorite(
  userId: string,
  sign: string,
  signType: "letter" | "word",
): Promise<boolean> {
  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("sign", sign)
    .eq("sign_type", signType)
    .single();
  return !!data;
}

/** Get all favorites for a user */
export async function getFavorites(userId: string): Promise<FavoriteRow[]> {
  const { data } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
