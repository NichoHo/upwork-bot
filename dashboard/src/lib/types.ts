export type BudgetType = "fixed" | "hourly";
export type JobStatus = "shortlisted" | "rejected" | "applied" | "expired";
export type BidAccount = "skydeck" | "nicholas";

export type ScoreBreakdownEntry = { points: number; reason: string };

export type Job = {
  id: string;
  url: string;
  title: string;
  description: string;
  budget_type: BudgetType | null;
  budget_amount: number | null;
  rate_min: number | null;
  rate_max: number | null;
  proposals_tier: string | null;
  client_country: string | null;
  client_spend: number | null;
  client_rating: number | null;
  client_reviews: number | null;
  client_hires: number | null;
  client_contracts_total: number | null;
  total_hired: number | null;
  invites_sent: number | null;
  invited_to_interview: number | null;
  total_offered: number | null;
  connects_cost: number | null;
  skills: string[] | null;
  published_at: string | null;
  first_seen_at: string;
  score: number | null;
  score_breakdown: ScoreBreakdownEntry[] | null;
  service_line: string | null;
  proof_urls: string[] | null;
  bid_account: BidAccount | null;
  status: JobStatus;
  rejection_reason: string | null;
  run_id: string | null;
};

export type ScreeningAnswer = { question: string; answer: string };

export type Draft = {
  id: string;
  job_id: string;
  cover_letter: string | null;
  screening_answers: ScreeningAnswer[] | null;
  bid_amount: number | null;
  milestones: unknown | null;
  todo_notes: string[] | null;
  version: number;
  edited_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Run = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "ok" | "partial" | "failed";
  jobs_seen: number | null;
  jobs_scored: number | null;
  jobs_shortlisted: number | null;
  error: string | null;
};
