"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

const ContinueForm = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) => {
  const [isLoading, setIsLoading] = useState(false);

  const signInWithGoogle = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Use NEXT_PUBLIC_BASE_URL if available, otherwise fall back to window.location.origin
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;

      // Validate that we have a valid base URL
      if (!baseUrl) {
        throw new Error(
          "Base URL is not configured. Please check your environment variables."
        );
      }

      // Construct the redirect URL using URL constructor to handle trailing slashes properly
      const redirectUrl = new URL(
        "/auth/confirm?next=/dash",
        baseUrl
      ).toString();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to sign in with Google";
      toast.error(message);
      setIsLoading(false);
    }
    // Note: If OAuth succeeds, user is redirected and loading state persists
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Spaced Algos</CardTitle>
          <CardDescription>
            Sign in or create an account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={signInWithGoogle}
            className="w-full"
            variant="outline"
            disabled={isLoading}
          >
            <Image
              src="/images/googleicon.svg"
              alt="Google logo"
              className="mr-2"
              width={20}
              height={20}
            />
            {isLoading ? "Redirecting..." : "Continue with Google"}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContinueForm;
