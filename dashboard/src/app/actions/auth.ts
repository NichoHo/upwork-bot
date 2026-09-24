"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function requestMagicLink(
  _prevState: { error: string | null; sent: boolean },
  formData: FormData,
): Promise<{ error: string | null; sent: boolean }> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter an email address.", sent: false };
  }

  // Build the redirect from the request's own origin rather than Supabase's
  // single configured Site URL, so the same code works for local dev and
  // the deployed app. The target still has to be on Supabase's allowed
  // redirect URL list (Auth > URL Configuration) or exchangeCodeForSession
  // will reject it.
  const origin = (await headers()).get("origin");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });

  if (error) {
    return { error: error.message, sent: false };
  }

  return { error: null, sent: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Confirms the current session belongs to an allowlisted member, per Phase 6:
 * every protected page checks auth on the server, not just in proxy.ts.
 * Redirects away otherwise. Returns the member row on success.
 */
export async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("members")
    .select("user_id, email, display_name, upwork_account")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    await supabase.auth.signOut();
    redirect("/access-denied");
  }

  return member;
}
