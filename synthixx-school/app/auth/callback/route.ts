import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/site-url";

function loginErrorUrl(origin: string, message: string) {
  return `${origin}/login?error=auth&message=${encodeURIComponent(message)}`;
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid_client") || m.includes("client secret")) {
    return "Google sign-in is misconfigured. In Supabase → Authentication → Providers → Google, re-enter the Client ID and Client Secret from Google Cloud Console.";
  }
  if (m.includes("redirect_uri_mismatch")) {
    return "Sign-in redirect URL mismatch. Add your app URL to Supabase Auth redirect URLs and Google OAuth authorized redirect URIs.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email first, then sign in.";
  }
  return message || "Authentication failed. Please try again.";
}

/** OAuth / email-confirmation callback: exchanges the code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/school";
  const next = rawNext.startsWith("/") ? rawNext : "/school";
  const origin = getSiteUrl(request);
  const providerError = searchParams.get("error");
  const providerErrorDescription = searchParams.get("error_description");

  if (providerError) {
    const msg =
      providerErrorDescription ||
      "Google login failed. Please check Google provider settings and try again.";
    return NextResponse.redirect(loginErrorUrl(origin, friendlyAuthError(msg)));
  }

  if (!code) {
    return NextResponse.redirect(
      loginErrorUrl(origin, "Auth callback failed. Please try sign in again."),
    );
  }

  // Attach session cookies to the redirect response (required for SSR on Vercel).
  const redirectTo = `${origin}${next}`;
  let response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.redirect(redirectTo);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    return response;
  }

  return NextResponse.redirect(
    loginErrorUrl(origin, friendlyAuthError(error.message)),
  );
}

// Re-export for tests / docs — canonical callback path used in Supabase dashboard.
export const AUTH_CALLBACK_PATH = "/auth/callback";
