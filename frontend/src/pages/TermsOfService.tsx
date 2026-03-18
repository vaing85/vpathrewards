const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: March 18, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
              <p>By accessing or using V PATHing Rewards ("the Platform"), operated by V PATHing Enterprise LLC, you agree to be bound by these Terms of Service. If you do not agree, please do not use our Platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p>V PATHing Rewards is a cashback and loyalty rewards platform that allows members to earn cashback on qualifying purchases made through our affiliate partner links. We connect consumers with merchants and earn affiliate commissions, a portion of which is shared with our members as cashback.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Eligibility</h2>
              <p>You must be at least 18 years old and a resident of the United States to use this Platform. By registering, you represent and warrant that you meet these requirements.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Account Registration</h2>
              <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your password and for all activities that occur under your account. Notify us immediately of any unauthorized use at support@vpathrewards.store.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cashback Earning</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Cashback is earned on qualifying purchases made through our affiliate links.</li>
                <li>Cashback rates are set by our merchant partners and are subject to change.</li>
                <li>Cashback may be reversed if a purchase is returned, cancelled, or flagged as fraudulent.</li>
                <li>We are not responsible for merchant errors or tracking failures beyond our control.</li>
                <li>Cashback bonuses vary by membership tier (Free, Silver, Gold, Platinum).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Withdrawals</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Minimum withdrawal amount is $10.00.</li>
                <li>Withdrawal requests are processed within 5-10 business days.</li>
                <li>We reserve the right to verify your identity before processing withdrawals.</li>
                <li>Fraudulent withdrawal attempts will result in account termination.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Membership Plans & Billing</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Paid membership plans (Silver, Gold, Platinum) are billed monthly via Stripe.</li>
                <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
                <li>You may cancel your subscription at any time through your account settings.</li>
                <li>Refunds are not provided for partial billing periods.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Referral Program</h2>
              <p>You may refer others to the Platform using your unique referral link. Referral bonuses are awarded when the referred user completes a qualifying action. We reserve the right to modify or terminate the referral program at any time.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Prohibited Activities</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Creating multiple accounts to abuse cashback or referral programs.</li>
                <li>Using bots, scripts, or automated tools to generate cashback.</li>
                <li>Attempting to defraud merchants, users, or the Platform.</li>
                <li>Sharing, selling, or transferring your account to another person.</li>
                <li>Any activity that violates applicable laws or regulations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Termination</h2>
              <p>We reserve the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any other reason at our sole discretion. Upon termination, any pending cashback may be forfeited.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Disclaimer of Warranties</h2>
              <p>The Platform is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access, accuracy of cashback rates, or that all purchases will be tracked successfully.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, V PATHing Enterprise LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Governing Law</h2>
              <p>These Terms are governed by the laws of the United States. Any disputes shall be resolved in the applicable courts of jurisdiction.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Changes to Terms</h2>
              <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated Terms. We will notify users of significant changes via email.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Contact Us</h2>
              <p>If you have questions about these Terms, please contact us at:</p>
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

export default TermsOfService;
