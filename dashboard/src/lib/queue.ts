import { createClient } from "@/lib/supabase/server";
import type { Draft, Job, Run } from "@/lib/types";

export async function getShortlistedJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "shortlisted")
    .order("score", { ascending: false });
  if (error) throw error;
  return data;
}

// Job ids whose draft has been hand-edited, for the amber "Draft edited"
// row state (BLUEPRINT.md §6). A plain edited_by-not-null flag per job,
// fetched separately rather than joined, since the join only ever needs
// this one boolean and a separate query is simpler than shaping a nested
// select result.
export async function getEditedJobIds(jobIds: string[]): Promise<string[]> {
  if (jobIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drafts")
    .select("job_id")
    .in("job_id", jobIds)
    .not("edited_by", "is", null);
  if (error) throw error;
  return data.map((d) => d.job_id);
}

export async function getJob(id: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDraft(jobId: string): Promise<Draft | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLatestRun(): Promise<Run | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRejectedToday(): Promise<Job[]> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "rejected")
    .gte("first_seen_at", startOfDay.toISOString())
    .order("first_seen_at", { ascending: false });
  if (error) throw error;
  return data;
}
