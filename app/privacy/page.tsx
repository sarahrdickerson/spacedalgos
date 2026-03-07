import Link from "next/link";

export default function PrivacyPage() {
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
              <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">
                Last updated: March 6, 2026
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Spaced Algos ("we", "us", or "our") is committed to protecting
                  your privacy. This Privacy Policy explains how we collect,
                  use, and protect your personal information when you use our
                  Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">
                  2. Information We Collect
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      2.1 Account Information
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      When you create an account, we collect:
                    </p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>Email address (from your OAuth provider)</li>
                      <li>
                        Name and profile picture (from your OAuth provider)
                      </li>
                      <li>OAuth provider identifier (Google)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">2.2 Usage Data</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      We automatically collect information about how you use the
                      Service:
                    </p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>Problem-solving attempts and performance grades</li>
                      <li>Study session data and review schedules</li>
                      <li>Progress tracking and statistics</li>
                      <li>Activity streaks and completion dates</li>
                      <li>Notes and time spent on problems</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      2.3 Technical Information
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      We collect basic technical information:
                    </p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>IP address and browser type</li>
                      <li>Device and operating system information</li>
                      <li>Session data and cookies for authentication</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  3. How We Use Your Information
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  We use your information to:
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Provide and maintain the Service</li>
                  <li>Track your learning progress and schedule reviews</li>
                  <li>Personalize your experience</li>
                  <li>Communicate with you about the Service</li>
                  <li>Improve and optimize the Service</li>
                  <li>Ensure security and prevent abuse</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  4. Data Storage and Security
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Your data is stored securely using Supabase (PostgreSQL
                  database) with encryption in transit and at rest. We implement
                  industry-standard security measures to protect your
                  information.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  However, no method of transmission over the internet is 100%
                  secure. While we strive to protect your data, we cannot
                  guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  5. Data Sharing and Disclosure
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  We do not sell, trade, or rent your personal information to
                  third parties. We may share your information only in the
                  following circumstances:
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">
                      Service Providers:
                    </strong>{" "}
                    With Supabase for hosting and authentication services
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Legal Requirements:
                    </strong>{" "}
                    When required by law or to protect our rights
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Business Transfers:
                    </strong>{" "}
                    In connection with a merger, acquisition, or sale of assets
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  6. Cookies and Tracking
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use essential cookies for authentication and session
                  management. These are necessary for the Service to function
                  properly. We do not use third-party advertising or tracking
                  cookies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  7. Your Rights and Choices
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  You have the right to:
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Access your personal data</li>
                  <li>Update or correct your information</li>
                  <li>Delete your account and all associated data</li>
                  <li>Export your data</li>
                  <li>
                    Opt out of communications (except essential Service updates)
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  To exercise these rights, use the account deletion feature in
                  Settings or contact us through the feedback form.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  8. Data Retention
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your data for as long as your account is active.
                  When you delete your account, all personal data and progress
                  tracking information is permanently deleted from our systems.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  9. Children's Privacy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Service is not intended for users under 13 years of age.
                  We do not knowingly collect personal information from children
                  under 13.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  10. Third-Party Links
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Service contains links to LeetCode for problem solving. We
                  are not responsible for the privacy practices of external
                  sites. Please review their privacy policies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  11. International Data Transfers
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your information may be transferred to and processed in
                  countries other than your country of residence. By using the
                  Service, you consent to such transfers.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">
                  12. Changes to This Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will
                  notify you of any material changes by updating the "Last
                  updated" date. Your continued use of the Service after changes
                  constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">13. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions about this Privacy Policy or our data
                  practices, please contact us through the feedback form in the
                  application.
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
