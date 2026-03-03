import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Suspense } from "react";
import StartPracticeButton from "@/components/start-practice-button";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <nav className="w-full flex justify-center border-b border-b-muted h-16 sticky top-0 z-50 bg-background/95 backdrop-blur">
          <div className="w-full max-w-6xl flex justify-between items-center p-3 px-5 text-sm">
            {/* Mobile Menubar */}
            <div className="flex flex-row justify-start md:hidden items-center gap-2">
              <MobileNav />
              <h1 className="text-xl font-bold">spaced algos</h1>
            </div>

            {/* Desktop Menubar */}
            <div className="gap-5 items-center font-semibold hidden md:flex">
              <Link href={"/dash"} className="text-xl font-bold">
                spaced algos
              </Link>
              <NavLink href="/dash">
                study plans
              </NavLink>
              <NavLink href="/problemsets">
                problem sets
              </NavLink>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <Suspense>
                  <StartPracticeButton />
                </Suspense>
              </div>
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
          <div className="flex items-center gap-2">
            <DeployButton />
          </div>
        </footer>
      </div>
    </main>
  );
}
