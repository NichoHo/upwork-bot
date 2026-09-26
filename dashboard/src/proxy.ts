import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/access-denied"];

// ponytail: in-memory sliding window, per Vercel instance. Resets on cold
// start and isn't shared across concurrent instances, so it's an abuse
// brake for this app's 2 known users, not a real rate limiter. Upgrade to
// Upstash/Redis-backed limiting if that ever actually matters.
const RATE_LIMITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;

function isRateLimited(key: string, max: number): boolean {
  const now = Date.now();
  const hits = (RATE_LIMITS.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  RATE_LIMITS.set(key, hits);
  return hits.length > max;
}

function buildSecurityHeaders(nonce: string): Record<string, string> {
  const isDev = process.env.NODE_ENV === "development";
  // style-src allows unsafe-inline rather than a nonce: CSP has no nonce
  // mechanism for the style="" attribute (only <style> blocks get one), and
  // Radix UI (under shadcn/ui, used throughout this app) sets inline styles
  // at runtime for portals and positioning. Confirmed by testing a
  // nonce-only style-src against the real app: dozens of blocked-style
  // console errors on the login page alone. script-src stays nonce-strict,
  // which is where CSP's actual XSS defense value is.
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    "Content-Security-Policy": csp,
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

function withSecurityHeaders(response: NextResponse, headers: Record<string, string>) {
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const securityHeaders = buildSecurityHeaders(nonce);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const isWrite = request.method !== "GET" && request.method !== "HEAD";
  if (isWrite) {
    const isAuthPath = request.nextUrl.pathname.startsWith("/login");
    const limited = isAuthPath
      ? isRateLimited(`auth:${ip}`, 5)
      : isRateLimited(`write:${ip}`, 60);
    if (limited) {
      return withSecurityHeaders(
        new NextResponse("Too many requests.", { status: 429 }),
        securityHeaders,
      );
    }
  }

  // Every downstream request header override must carry x-nonce, since the
  // root layout reads it via headers() to nonce next-themes' inline script.
  request.headers.set("x-nonce", nonce);

  let response = withSecurityHeaders(NextResponse.next({ request }), securityHeaders);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = withSecurityHeaders(NextResponse.next({ request }), securityHeaders);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() verifies the JWT against Supabase, unlike getSession() which
  // just reads the cookie. This is also what refreshes an expired session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withSecurityHeaders(NextResponse.redirect(url), securityHeaders);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return withSecurityHeaders(NextResponse.redirect(url), securityHeaders);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
