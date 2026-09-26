"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  markSubmittedSchema,
  skipJobSchema,
  updateCoverLetterSchema,
} from "@/lib/validation";

export async function updateCoverLetter(jobId: string, coverLetter: string) {
  const input = updateCoverLetterSchema.parse({ jobId, coverLetter });
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_draft_cover_letter", {
    p_job_id: input.jobId,
    p_cover_letter: input.coverLetter,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function markSubmitted(jobId: string) {
  const input = markSubmittedSchema.parse({ jobId });
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_job_submitted", { p_job_id: input.jobId });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function skipJob(jobId: string, reason: string) {
  const input = skipJobSchema.parse({ jobId, reason });
  const supabase = await createClient();
  const { error } = await supabase.rpc("skip_job", {
    p_job_id: input.jobId,
    p_reason: input.reason,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
