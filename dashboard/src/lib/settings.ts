import { createClient } from "@/lib/supabase/server";

export async function getSetting(key: string): Promise<{ value: string; updatedAt: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data ? { value: data.value, updatedAt: data.updated_at } : null;
}
