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
import { Separator } from "@/components/ui/separator";

const ContinueForm = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) => {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);

  const constructRedirectUrl = () => {
    // Prefer NEXT_PUBLIC_BASE_URL if available, otherwise fall back to window.location.origin
    const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    const baseUrl =
      envBaseUrl !== undefined && envBaseUrl !== ""
        ? new URL(envBaseUrl).toString()
        : window.location.origin;
    // Construct the redirect URL using URL constructor to handle trailing slashes properly
    return new URL("/auth/confirm?next=/dash", baseUrl).toString();
  };

  const signInWithGoogle = async () => {
    setIsLoadingGoogle(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: constructRedirectUrl(),
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to sign in with Google";
      toast.error(message);
      setIsLoadingGoogle(false);
    }
    // Note: If OAuth succeeds, user is redirected and loading state persists
  };

  const signInWithGithub = async () => {
    setIsLoadingGithub(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: constructRedirectUrl(),
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to sign in with Github";
      toast.error(message);
      setIsLoadingGithub(false);
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
        <CardContent className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={signInWithGoogle}
            className="w-full"
            variant="outline"
            disabled={isLoadingGoogle}
          >
            <Image
              src="/images/googleicon.svg"
              alt="Google logo"
              className="mr-2"
              width={20}
              height={20}
            />
            {isLoadingGoogle ? "Redirecting..." : "Continue with Google"}
          </Button>
          <div className="flex flex-row w-full items-center gap-2">
            <Separator className="flex-1" />
            <p className="text-sm text-muted-foreground">OR</p>
            <Separator className="flex-1" />
          </div>
          <Button
            type="button"
            onClick={signInWithGithub}
            className="w-full"
            variant="outline"
            disabled={isLoadingGithub}
          >
            <Image
              src="/images/GitHub_Invertocat_White.svg"
              alt="Github logo"
              className="mr-2 invert dark:invert-0"
              width={20}
              height={20}
            />
            {isLoadingGithub ? "Redirecting..." : "Continue with Github"}
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
