import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Suspense } from "react";
import StartPracticeButton from "@/components/start-practice-button";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <nav className="w-full flex justify-center border-b border-b-muted h-16">
          <div className="w-full max-w-6xl flex justify-between items-center p-3 px-5 text-sm">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost"><HamburgerMenuIcon className="" /></Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col gap-5 pt-5 px-5" side="left">
                <SheetTitle className="text-xl font-bold pl-3">
                  spaced algos
                </SheetTitle>
                <Link href={"/dash"} className="w-full px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                  study plans
                </Link>
                <Link href={"/problemsets"} className="w-full px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                  problem sets
                </Link>
              </SheetContent>
            </Sheet>
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/dash"} className="text-xl font-bold">
                spaced algos
              </Link>
              <Link href={"/dash"} className="text-sm">
                study plans
              </Link>
              <Link href={"/problemsets"} className="text-sm">
                problem sets
              </Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Suspense>
                <StartPracticeButton />
              </Suspense>
              <ThemeSwitcher />
              <Suspense>
                <AuthButton />
              </Suspense>
            </div>
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 w-full max-w-6xl p-5">
          {children}
        </div>

        <footer className="w-full flex items-center justify-center border-t border-t-muted mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
