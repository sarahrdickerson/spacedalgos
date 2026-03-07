import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSwitcherInline } from "@/components/theme-switcher-inline";
import { DeleteAccountButton } from "./_components/delete-account-button";
import Link from "next/link";

async function AccountCard() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Your login details.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Password</p>
            <p className="text-sm text-muted-foreground">
              Send yourself a reset link to change your password.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/auth/forgot-password">Change password</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function AccountCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Your login details.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-4 w-48" />
        <Separator />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences.
        </p>
      </div>

      <Suspense fallback={<AccountCardSkeleton />}>
        <AccountCard />
      </Suspense>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how SpacedAlgos looks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Light, dark, or system default.
              </p>
            </div>
            
          </div>
          <ThemeSwitcherInline />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Irreversible actions. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data. Coming soon.
              </p>
            </div>
          </div>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
