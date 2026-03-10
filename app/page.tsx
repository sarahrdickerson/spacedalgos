import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import packageJson from "@/package.json";
import LogoMark from "@/components/logo-mark";

export default function Home() {
  // Stage item styles — matches actual app legend
  const c: Record<string, string> = {
    new: "text-[10px] leading-snug truncate text-violet-500 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-500 rounded px-1",
    lrn: "text-[10px] leading-snug truncate bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded px-1",
    rein: "text-[10px] leading-snug truncate bg-blue-100 dark:bg-blue-900/25 text-blue-600 dark:text-blue-400 rounded px-1",
    mast: "text-[10px] leading-snug truncate bg-green-100 dark:bg-green-900/25 text-green-700 dark:text-green-400 rounded px-1",
  };
  type CI = [string, string];
  // Calendar data mock
  const week1: Array<{ d: number; today?: boolean; items: CI[] }> = [
    {
      d: 9,
      today: true,
      items: [
        ["House Robber #2", "lrn"],
        ["Palindrome", "new"],
      ],
    },
    {
      d: 10,
      items: [
        ["Contains Dup #3", "rein"],
        ["Min Window", "new"],
      ],
    },
    {
      d: 11,
      items: [
        ["Two Sum #2", "lrn"],
        ["Search Rotated", "new"],
      ],
    },
    {
      d: 12,
      items: [
        ["Anagram #3", "rein"],
        ["Reorder List", "new"],
      ],
    },
    {
      d: 13,
      items: [
        ["Two Sum #4", "mast"],
        ["Merge K Lists", "new"],
      ],
    },
    {
      d: 14,
      items: [
        ["Palindrome #2", "lrn"],
        ["Invert BTree", "new"],
      ],
    },
    {
      d: 15,
      items: [
        ["House Rob #3", "rein"],
        ["Clone Graph", "new"],
      ],
    },
  ];
  // Mon Mar 16 → Sun Mar 22
  const week2: Array<{ d: number; items: CI[] }> = [
    {
      d: 16,
      items: [
        ["Contains #4", "mast"],
        ["BTree LO Trav", "new"],
      ],
    },
    {
      d: 17,
      items: [
        ["Min Window #2", "lrn"],
        ["Validate BST", "new"],
      ],
    },
    {
      d: 18,
      items: [
        ["Search Rot #3", "rein"],
        ["Build BTree", "new"],
      ],
    },
    {
      d: 19,
      items: [
        ["Anagram #4", "mast"],
        ["Find Median", "new"],
      ],
    },
    {
      d: 20,
      items: [
        ["Reorder Lst #2", "lrn"],
        ["Num Islands", "new"],
      ],
    },
    {
      d: 21,
      items: [
        ["Palindrome #3", "rein"],
        ["Word Search", "new"],
      ],
    },
    {
      d: 22,
      items: [
        ["House Rob #4", "mast"],
        ["Course Sched", "new"],
      ],
    },
  ];
  // Mon Mar 23 → Sun Mar 29
  const week3: Array<{ d: number; items: CI[] }> = [
    {
      d: 23,
      items: [
        ["Clone Graph #2", "lrn"],
        ["Graph Valid", "new"],
      ],
    },
    {
      d: 24,
      items: [
        ["BTree LO #3", "rein"],
        ["Combo Sum", "new"],
      ],
    },
    {
      d: 25,
      items: [
        ["Two Sum #5", "mast"],
        ["Pacific Water", "new"],
      ],
    },
    {
      d: 26,
      items: [
        ["Invert BT #2", "lrn"],
        ["Num Connected", "new"],
      ],
    },
    {
      d: 27,
      items: [
        ["Course Sch #3", "rein"],
        ["3Sum Closest", "new"],
      ],
    },
    {
      d: 28,
      items: [
        ["Contains #5", "mast"],
        ["Word Search II", "new"],
      ],
    },
    {
      d: 29,
      items: [
        ["Word Search #2", "lrn"],
        ["Longest Substr", "new"],
      ],
    },
  ];
  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(-0.3deg); }
          50%       { transform: translateY(-10px) rotate(0.3deg); }
        }
        .a0 { animation: fadeUp 0.55s ease-out 0ms   both; }
        .a1 { animation: fadeUp 0.55s ease-out 80ms  both; }
        .a2 { animation: fadeUp 0.55s ease-out 160ms both; }
        .a3 { animation: fadeUp 0.55s ease-out 280ms both; }
        .a4 { animation: fadeUp 0.55s ease-out 420ms both; }
        .card-float { animation: floatCard 5.5s ease-in-out infinite; }
        .squiggle { stroke-dasharray: 120; stroke-dashoffset: 120; animation: drawLine 0.8s ease-out 0.5s forwards; }
        @keyframes drawLine { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .card-float {
            animation: none;
          }
          .squiggle {
            animation: none;
          }
        }
      `}</style>

      <main className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
        {/* ── Nav ── */}
        <nav className="relative z-20 w-full flex justify-between items-center px-5 sm:px-8 py-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-bold text-base tracking-tight">
              spaced algos
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Link
              href="/auth/continue"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="relative">
          {/* Atmosphere — clipped so blobs don't cause scroll */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute inset-0" />
            <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-primary/10 blur-[90px]" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-primary/8 blur-[70px]" />
          </div>

          <div className="relative px-5 sm:px-8 py-8 lg:py-12 flex flex-col lg:flex-row items-center gap-10 lg:gap-12">
            {/* ── Left: copy ── */}
            <div className="flex-1 flex flex-col gap-6 text-center lg:text-left order-1">
              <div className="a0 flex justify-center lg:justify-start">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-primary uppercase bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  spaced repetition · algo interview prep
                </span>
              </div>

              <h1 className="a1 text-[2.5rem] sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.1]">
                Stop re-learning
                <br />
                the same{" "}
                <span className="relative whitespace-nowrap">
                  <span className="relative z-10 text-primary">problems.</span>
                  <svg
                    className="absolute -bottom-1.5 left-0 w-full overflow-visible"
                    height="10"
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 7 Q20 2 38 6 Q56 10 74 5 Q88 2 98 6"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="none"
                      className="text-primary squiggle"
                      strokeLinecap="round"
                      opacity="0.5"
                    />
                  </svg>
                </span>
              </h1>

              <p className="a2 text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
                Spaced algos schedules your reviews so you see each problem{" "}
                <em className="text-foreground not-italic font-medium">
                  right before you forget it
                </em>{" "}
                — and never wastes your time on what you already know.
              </p>

              <div className="a3 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link
                  href="/auth/continue"
                  className="group inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:opacity-90 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
                >
                  Start practicing
                  <span className="group-hover:translate-x-1 transition-transform inline-block">
                    →
                  </span>
                </Link>
              </div>
            </div>

            {/* ── Right: mini calendar mockup — bleeds off right edge on desktop ── */}
            <div className="a4 flex-shrink-0 w-full max-w-[420px] lg:w-[560px] lg:max-w-none mx-auto lg:mx-0 lg:-mr-16 order-2">
              <div className="card-float">
                <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 overflow-hidden">
                  {/* Day headers — Mon start so today is first cell */}
                  <div className="grid grid-cols-7 bg-muted/30 border-b border-border/50">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (d) => (
                        <div
                          key={d}
                          className="text-center py-1.5 text-[9px] font-medium text-muted-foreground tracking-wide"
                        >
                          {d}
                        </div>
                      ),
                    )}
                  </div>

                  {/* Calendar rows — bottom fade implies more weeks ahead */}
                  <div className="relative">
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none" />

                    {/* Week 1: Mar 9–15 */}
                    <div className="grid grid-cols-7 divide-x divide-border/40 border-b border-border/40">
                      {week1.map(({ d, today, items }) => (
                        <div
                          key={d}
                          className={`p-2 flex flex-col gap-1${today ? " bg-primary/5" : ""}`}
                        >
                          {today ? (
                            <div className="inline-flex w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full items-center justify-center text-[9px] font-bold leading-none self-start flex-shrink-0 mb-0.5">
                              {d}
                            </div>
                          ) : (
                            <span className="text-[10px] font-medium text-foreground/60 leading-none mb-0.5">
                              {d}
                            </span>
                          )}
                          {items.map(([name, type], i) => (
                            <span key={i} className={`block ${c[type]}`}>
                              {name}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Week 2: Mar 16–22 */}
                    <div className="grid grid-cols-7 divide-x divide-border/40 border-b border-border/40">
                      {week2.map(({ d, items }) => (
                        <div key={d} className="p-2 flex flex-col gap-1">
                          <span className="text-[10px] font-medium text-foreground/60 leading-none mb-0.5">
                            {d}
                          </span>
                          {items.map(([name, type], i) => (
                            <span key={i} className={`block ${c[type]}`}>
                              {name}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Week 3: Mar 23–29 */}
                    <div className="grid grid-cols-7 divide-x divide-border/40">
                      {week3.map(({ d, items }) => (
                        <div key={d} className="p-2 flex flex-col gap-1">
                          <span className="text-[10px] font-medium text-foreground/60 leading-none mb-0.5">
                            {d}
                          </span>
                          {items.map(([name, type], i) => (
                            <span key={i} className={`block ${c[type]}`}>
                              {name}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer: legend + CTA */}
                  <div className="px-4 py-3 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 flex-shrink-0" />
                        learning
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 flex-shrink-0" />
                        reinforcing
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-sm bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-700 flex-shrink-0" />
                        mastered
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-violet-300 dark:border-violet-500 flex-shrink-0" />
                        new
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(
              [
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <polyline
                        points="1 10 5 10 7.5 3 12.5 17 15 10 19 10"
                        className="stroke-primary"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                  label: "Science-backed intervals",
                  desc: "SM-2 adapted for coding problems. Reviews surface at the exact moment your retention dips. Not sooner, not later.",
                },
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="2"
                        y="3"
                        width="16"
                        height="15"
                        rx="2"
                        className="stroke-primary"
                        strokeWidth="1.75"
                      />
                      <line
                        x1="2"
                        y1="7.5"
                        x2="18"
                        y2="7.5"
                        className="stroke-primary"
                        strokeWidth="1.75"
                      />
                      <line
                        x1="6"
                        y1="1.5"
                        x2="6"
                        y2="5"
                        className="stroke-primary"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                      <line
                        x1="14"
                        y1="1.5"
                        x2="14"
                        y2="5"
                        className="stroke-primary"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                      <rect
                        x="5"
                        y="10"
                        width="3"
                        height="3"
                        rx="0.5"
                        className="fill-primary"
                        opacity="0.8"
                      />
                      <rect
                        x="11"
                        y="10"
                        width="3"
                        height="3"
                        rx="0.5"
                        className="fill-primary"
                        opacity="0.4"
                      />
                      <rect
                        x="5"
                        y="14.5"
                        width="3"
                        height="2"
                        rx="0.5"
                        className="fill-primary"
                        opacity="0.3"
                      />
                      <rect
                        x="11"
                        y="14.5"
                        width="3"
                        height="2"
                        rx="0.5"
                        className="fill-primary"
                        opacity="0.6"
                      />
                    </svg>
                  ),
                  label: "Visual review calendar",
                  desc: "A calendar view shows your full schedule: past reviews, upcoming ones, and projected new problems.",
                },
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M10 1.5 L12.6 7 L18.5 7.8 L14.25 11.9 L15.3 17.75 L10 14.9 L4.7 17.75 L5.75 11.9 L1.5 7.8 L7.4 7 Z"
                        className="stroke-primary fill-primary/15"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                  label: "Streaks & momentum",
                  desc: "Daily streaks and stats give you the feedback loop to build a real interview prep habit that sticks.",
                },
              ] as { icon: React.ReactNode; label: string; desc: string }[]
            ).map(({ icon, label, desc }) => (
              <div
                key={label}
                className="group flex flex-col gap-4 p-5 rounded-xl border border-border/50 bg-card/40 hover:border-primary/30 hover:bg-card transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center group-hover:bg-primary/18 transition-colors">
                  {icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-card-foreground mb-1.5">
                    {label}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="text-center py-6 text-xs text-muted-foreground/50 border-t border-border/30">
          spaced algos beta v{packageJson.version} · developed by{" "}
          <Link
            href="https://sarahrdickerson.github.io"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            sarah dickerson
          </Link>
        </footer>
      </main>
    </>
  );
}
