import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Nav */}
      <nav className="w-full flex justify-between items-center px-6 py-4 border-b border-border/50">
        <span className="font-bold text-lg tracking-tight">spaced algos</span>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="text-sm px-4 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center gap-10">
        {/* Cute computer illustration */}
        <div className="relative select-none" aria-hidden>
          <svg
            width="180"
            height="160"
            viewBox="0 0 180 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            {/* Monitor body */}
            <rect
              x="20"
              y="10"
              width="140"
              height="100"
              rx="12"
              className="fill-card stroke-border"
              strokeWidth="2"
            />
            {/* Screen */}
            <rect
              x="32"
              y="22"
              width="116"
              height="76"
              rx="6"
              className="fill-muted"
            />
            {/* Screen glow / code lines */}
            <rect
              x="42"
              y="36"
              width="60"
              height="5"
              rx="2.5"
              className="fill-primary"
              opacity="0.7"
            />
            <rect
              x="42"
              y="47"
              width="80"
              height="5"
              rx="2.5"
              className="fill-primary"
              opacity="0.4"
            />
            <rect
              x="42"
              y="58"
              width="50"
              height="5"
              rx="2.5"
              className="fill-primary"
              opacity="0.6"
            />
            <rect
              x="42"
              y="69"
              width="70"
              height="5"
              rx="2.5"
              className="fill-primary"
              opacity="0.3"
            />
            <rect
              x="42"
              y="80"
              width="40"
              height="5"
              rx="2.5"
              className="fill-primary"
              opacity="0.5"
            />
            {/* Cursor blink */}
            <rect
              x="86"
              y="80"
              width="3"
              height="5"
              rx="1"
              className="fill-primary"
            />
            {/* Stand neck */}
            <rect
              x="82"
              y="110"
              width="16"
              height="16"
              rx="2"
              className="fill-muted stroke-border"
              strokeWidth="1.5"
            />
            {/* Stand base */}
            <rect
              x="60"
              y="126"
              width="60"
              height="10"
              rx="5"
              className="fill-muted stroke-border"
              strokeWidth="1.5"
            />
            {/* Little stars / sparkles */}
            <circle
              cx="162"
              cy="22"
              r="3"
              className="fill-primary"
              opacity="0.5"
            />
            <circle
              cx="170"
              cy="38"
              r="2"
              className="fill-primary"
              opacity="0.35"
            />
            <circle
              cx="155"
              cy="42"
              r="1.5"
              className="fill-primary"
              opacity="0.5"
            />
            <circle
              cx="18"
              cy="55"
              r="2.5"
              className="fill-primary"
              opacity="0.4"
            />
            <circle
              cx="10"
              cy="38"
              r="1.5"
              className="fill-primary"
              opacity="0.3"
            />
            <circle
              cx="25"
              cy="30"
              r="2"
              className="fill-primary"
              opacity="0.45"
            />
          </svg>
          {/* Floating badge */}
          <span className="absolute -top-2 -right-4 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold shadow">
            ✦ spaced
          </span>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-4 max-w-xl">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Actually remember{" "}
            <span className="text-primary">what you learn.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Spaced repetition for coding interview prep. Practice the right
            problems at the right time — so nothing slips through the cracks.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/auth/sign-up"
            className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors shadow-md"
          >
            Get started →
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            I already have an account
          </Link>
        </div>
      </div>

      {/* Feature strip */}
      <div className="border-t border-border/50 bg-muted/30">
        <div className="max-w-3xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            {
              emoji: "🧠",
              title: "Spaced repetition",
              body: "Smart scheduling surfaces problems exactly when you're about to forget them.",
            },
            {
              emoji: "📅",
              title: "Visual calendar",
              body: "See your review schedule at a glance and plan your practice around your life.",
            },
            {
              emoji: "🔥",
              title: "Streak tracking",
              body: "Build a daily habit with streaks that keep you accountable and motivated.",
            },
          ].map(({ emoji, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-2">
              <span className="text-3xl">{emoji}</span>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
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
        · spaced algos
      </footer>
    </main>
  );
}
