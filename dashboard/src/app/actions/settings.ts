"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateSetting(key: string, value: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_setting", { p_key: key, p_value: value });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
