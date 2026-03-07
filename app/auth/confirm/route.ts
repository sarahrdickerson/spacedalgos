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
    if (error) {
      console.error("OAuth error:", error);
      redirect(
        `/auth/error?error=${encodeURIComponent(
          error.message || "Authentication failed. Please try again."
        )}`
      );
    }

    // For new users, ensure user_preferences row exists
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Try to create user_preferences if it doesn't exist (ignore conflicts)
      await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
        },
        {
          onConflict: "user_id",
          ignoreDuplicates: true,
        }
      );
    }

    redirect(next ?? "/dash");
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
      redirect(
        `/auth/error?error=${encodeURIComponent(
          "Verification failed. Please try again."
        )}`
      );
    }
  }

  // redirect the user to an error page with some instructions
  redirect(
    `/auth/error?error=${encodeURIComponent("Invalid authentication request.")}`
  );
}
