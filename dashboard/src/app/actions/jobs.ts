"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateCoverLetter(jobId: string, coverLetter: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_draft_cover_letter", {
    p_job_id: jobId,
    p_cover_letter: coverLetter,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function markSubmitted(jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_job_submitted", { p_job_id: jobId });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function skipJob(jobId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("skip_job", { p_job_id: jobId, p_reason: reason });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
