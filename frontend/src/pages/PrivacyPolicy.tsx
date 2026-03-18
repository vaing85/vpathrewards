const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: March 18, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p>V PATHing Enterprise LLC ("we," "us," or "our") operates V PATHing Rewards (vpathrewards.store). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully. If you disagree with its terms, please discontinue use of the Platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
              <h3 className="text-base font-semibold text-gray-800 mb-2">Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Account Information:</strong> Name, email address, and password when you register.</li>
                <li><strong>Payment Information:</strong> Billing details processed securely by Stripe. We do not store your full payment card number.</li>
                <li><strong>Profile Information:</strong> PayPal email or other payout details you add to your profile.</li>
                <li><strong>Communications:</strong> Messages you send to our support team.</li>
              </ul>
              <h3 className="text-base font-semibold text-gray-800 mb-2">Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Usage Data:</strong> Pages visited, offers clicked, time spent on the Platform.</li>
                <li><strong>Device Information:</strong> Browser type, operating system, IP address.</li>
                <li><strong>Cookies & Tracking:</strong> We use cookies and similar tracking technologies to maintain sessions and improve your experience.</li>
                <li><strong>Analytics:</strong> We use Google Analytics (GA4) to understand how users interact with our Platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To create and manage your account.</li>
                <li>To track qualifying purchases and calculate cashback earned.</li>
                <li>To process withdrawal requests and payments.</li>
                <li>To manage your membership subscription via Stripe.</li>
                <li>To send transactional emails (e.g., withdrawal confirmations, account notices).</li>
                <li>To send promotional communications (you may opt out at any time).</li>
                <li>To prevent fraud and enforce our Terms of Service.</li>
                <li>To analyze platform usage and improve our services.</li>
                <li>To comply with legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Sharing Your Information</h2>
              <p className="mb-3">We do not sell your personal information. We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Affiliate Networks (CJ Affiliate):</strong> Click and transaction data is shared to track qualifying purchases and calculate commissions.</li>
                <li><strong>Stripe:</strong> Payment processing for subscriptions and withdrawals.</li>
                <li><strong>Google Analytics:</strong> Aggregated usage data to analyze platform performance.</li>
                <li><strong>Service Providers:</strong> Hosting (Railway), email delivery, and other operational services.</li>
                <li><strong>Legal Authorities:</strong> When required by law, court order, or to protect our legal rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies</h2>
              <p className="mb-3">We use the following types of cookies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for the Platform to function (e.g., authentication tokens).</li>
                <li><strong>Analytics Cookies:</strong> Google Analytics cookies to measure traffic and usage patterns.</li>
                <li><strong>Affiliate Tracking Cookies:</strong> Used to attribute purchases to your account for cashback credit.</li>
              </ul>
              <p className="mt-3">You may disable cookies in your browser settings, but some Platform features may not work properly.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
              <p>We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting us at support@vpathrewards.store. We may retain certain data for legal compliance, fraud prevention, or dispute resolution purposes.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Security</h2>
              <p>We implement industry-standard security measures including:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>HTTPS encryption for all data in transit.</li>
                <li>Bcrypt hashing for passwords.</li>
                <li>JWT-based authentication with secure token storage.</li>
                <li>Rate limiting to prevent brute-force attacks.</li>
                <li>Secure database access via Supabase (PostgreSQL).</li>
              </ul>
              <p className="mt-3">No method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights</h2>
              <p className="mb-3">Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data ("right to be forgotten").</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails at any time via the unsubscribe link.</li>
                <li><strong>Portability:</strong> Request your data in a portable format.</li>
              </ul>
              <p className="mt-3">To exercise any of these rights, contact us at support@vpathrewards.store.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
              <p>Our Platform is not directed to children under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Third-Party Links</h2>
              <p>Our Platform contains links to merchant websites and affiliate partner sites. These third-party sites have their own privacy policies, and we are not responsible for their practices. We encourage you to review the privacy policy of any site you visit.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email and by updating the "Last updated" date above. Your continued use of the Platform after changes constitutes acceptance of the updated policy.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
              <p>If you have questions or concerns about this Privacy Policy, please contact us at:</p>
              <p className="mt-2">
                <strong>V PATHing Enterprise LLC</strong><br />
                Email: <a href="mailto:support@vpathrewards.store" className="text-primary-600 hover:underline">support@vpathrewards.store</a><br />
                Website: <a href="https://vpathrewards.store" className="text-primary-600 hover:underline">vpathrewards.store</a>
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
