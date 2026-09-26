"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { OutcomeStatus } from "@/lib/types";
import { updateOutcomeStatusSchema } from "@/lib/validation";

export async function updateOutcomeStatus(jobId: string, status: Exclude<OutcomeStatus, "waiting">) {
  const input = updateOutcomeStatusSchema.parse({ jobId, status });
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_outcome_status", {
    p_job_id: input.jobId,
    p_status: input.status,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/sent");
}
