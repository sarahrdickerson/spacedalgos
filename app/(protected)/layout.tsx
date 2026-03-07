import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Suspense } from "react";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";
import { DashboardProvider } from "./_components/dashboard-provider";
import packageJson from "@/package.json";

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
              <Link href={"/dash"} className="text-xl font-bold">
                spaced algos
              </Link>
            </div>

            {/* Desktop Menubar */}
            <div className="gap-5 items-center font-semibold hidden md:flex">
              <Link href={"/dash"} className="text-xl font-bold">
                spaced algos
              </Link>
              <NavLink href="/dash">dashboard</NavLink>
              <NavLink href="/problems">problems</NavLink>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <Suspense>
                <AuthButton />
              </Suspense>
            </div>
          </div>
        </nav>
        <DashboardProvider>
          <div className="flex-1 flex flex-col gap-20 w-full max-w-6xl p-5">
            {children}
          </div>
        </DashboardProvider>

        <footer className="text-center py-6 text-xs text-muted-foreground/50 border-t border-border/30">
          developed by{" "}
          <Link
            href="https://sarahrdickerson.github.io"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            sarah dickerson
          </Link>{" "}
          · spaced algos beta v{packageJson.version}
        </footer>
      </div>
    </main>
  );
}
