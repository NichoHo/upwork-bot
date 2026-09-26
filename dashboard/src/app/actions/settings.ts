"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateSettingSchema } from "@/lib/validation";

export async function updateSetting(key: string, value: string) {
  const input = updateSettingSchema.parse({ key, value });
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_setting", {
    p_key: input.key,
    p_value: input.value,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
