import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data, error: rpcError } = await supabase.rpc("provision_member");

      if (rpcError) {
        // A real failure (e.g. the insert itself got rejected), not a
        // legitimate "not allowlisted" result. Don't show access-denied for
        // this, that reads as "you're not authorized" when the actual
        // problem is server-side and needs fixing, not a different email.
        console.error("provision_member failed:", rpcError.message);
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=provisioning_failed`);
      }

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
