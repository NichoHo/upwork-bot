import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data } = await supabase.rpc("provision_member");

      if (data) {
        return NextResponse.redirect(`${origin}/`);
      }

      // Authenticated, but the email isn't on the allowlist. Never leave
      // them signed in against a members-gated app.
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/access-denied`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalid`);
}
