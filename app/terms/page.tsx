import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <nav className="w-full flex justify-center border-b border-border bg-background h-16">
        <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
          <Link
            href="/"
            className="text-xl font-bold hover:opacity-80 transition-opacity"
          >
            spaced algos
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 py-8 sm:py-12">
        <div className="bg-background border border-border rounded-lg shadow-sm p-6 sm:p-10">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <div className="border-b border-border pb-6 mb-8">
              <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">
                Last updated: March 6, 2026
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  1. Acceptance of Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing and using Spaced Algos ("the Service"), you agree
                  to be bound by these Terms of Service. If you do not agree to
                  these terms, please do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  2. Description of Service
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Spaced Algos is a web application that helps users prepare for
                  coding interviews using spaced repetition techniques. The
                  Service provides access to curated problem sets, progress
                  tracking, and scheduling features.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  3. User Accounts
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  You are responsible for maintaining the confidentiality of
                  your account credentials. You agree to accept responsibility
                  for all activities that occur under your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">4. User Conduct</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You agree not to:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>Use the Service for any unlawful purpose</li>
                  <li>
                    Attempt to gain unauthorized access to the Service or its
                    systems
                  </li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Share your account with others</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  5. Intellectual Property
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  The Service and its original content, features, and
                  functionality are owned by Spaced Algos and are protected by
                  international copyright, trademark, and other intellectual
                  property laws.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Problem sets and questions are sourced from publicly available
                  resources (LeetCode) and we do not claim ownership of these
                  problems.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  6. Data and Privacy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your use of the Service is also governed by our{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  . We collect and use your data as described in that policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  7. Disclaimer of Warranties
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Service is provided "as is" and "as available" without
                  warranties of any kind, either express or implied. We do not
                  guarantee that the Service will be uninterrupted, secure, or
                  error-free.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  8. Limitation of Liability
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  In no event shall Spaced Algos be liable for any indirect,
                  incidental, special, consequential, or punitive damages
                  arising out of or relating to your use of the Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">9. Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to terminate or suspend your account at
                  any time, with or without notice, for conduct that we believe
                  violates these Terms or is harmful to other users or the
                  Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  10. Changes to Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these Terms at any time. We
                  will notify users of any material changes by updating the
                  "Last updated" date. Your continued use of the Service after
                  changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">11. Contact</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms, please contact us
                  through the feedback form in the application.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-border/30 py-6 text-center text-xs text-muted-foreground/50">
        <Link href="/privacy" className="hover:underline mx-2">
          Privacy
        </Link>
        ·
        <Link href="/terms" className="hover:underline mx-2">
          Terms
        </Link>
      </footer>
    </div>
  );
}
