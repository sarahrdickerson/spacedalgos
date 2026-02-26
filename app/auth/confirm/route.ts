import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

function isValidRedirect(url: string | null): boolean {
  if (!url) return false;
  // Must start with "/" and not "//" (protocol-relative URL)
  return url.startsWith("/") && !url.startsWith("//") && !url.includes("://");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = isValidRedirect(nextParam) ? nextParam : "/dash";

  const supabase = await createClient();

  // Handle OAuth callback
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next ?? "/dash");
    } else {
      redirect(`/auth/error?error=${encodeURIComponent("Authentication failed. Please try again.")}`);
    }
  }

  // Handle email verification
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      redirect(next ?? "/dash");
    } else {
      redirect(`/auth/error?error=${encodeURIComponent("Verification failed. Please try again.")}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=${encodeURIComponent("Invalid authentication request.")}`);
}
