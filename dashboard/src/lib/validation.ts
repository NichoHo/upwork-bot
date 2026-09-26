import { z } from "zod";

// Upwork job ids are opaque strings, not UUIDs, so this just bounds length
// and non-emptiness. Real access control is the RLS-gated RPC, not this;
// this is a cheap first rejection so malformed input never reaches it.
const jobId = z.string().trim().min(1).max(200);

export const updateCoverLetterSchema = z.object({
  jobId,
  coverLetter: z.string().max(20_000),
});

export const skipJobSchema = z.object({
  jobId,
  reason: z.string().trim().min(1).max(2_000),
});

export const markSubmittedSchema = z.object({ jobId });

export const updateOutcomeStatusSchema = z.object({
  jobId,
  status: z.enum(["replied", "interviewing", "won", "lost"]),
});

export const updateSettingSchema = z.object({
  key: z.string().trim().min(1).max(200),
  value: z.string().max(50_000),
});
