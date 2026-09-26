"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { OutcomeStatus } from "@/lib/types";

export async function updateOutcomeStatus(jobId: string, status: Exclude<OutcomeStatus, "waiting">) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_outcome_status", {
    p_job_id: jobId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/sent");
}
