import { Link } from 'react-router-dom';

const AffiliateDisclosure = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Affiliate Disclosure</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: May 26, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Our Affiliate Relationships</h2>
              <p>VPath Rewards, operated by V PATHing Enterprise LLC, is a cashback and loyalty rewards platform that participates in affiliate and advertising programs. When you click an offer on our Platform and complete a qualifying purchase, we may earn a commission from the merchant or from an affiliate network (such as CJ Affiliate) that connects us with that merchant.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How You Benefit</h2>
              <p>We share a portion of the affiliate commissions we earn with you as cashback. VPath Rewards is free to join, and the share of commission you keep is determined by your membership tier, which rises automatically as your confirmed spend grows. This is how we are able to offer the Platform at no cost to you.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. No Extra Cost to You</h2>
              <p>Using our affiliate links never costs you anything extra. The price you pay at a merchant is the same whether or not you shop through VPath Rewards. We do not add fees to your purchases.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Offer Accuracy &amp; Availability</h2>
              <p>Cashback rates, offers, and merchant availability are provided by our affiliate partners and merchants and can change at any time. Qualifying purchases, cashback amounts, and final approval are subject to each merchant's and affiliate network's terms and tracking. We are not responsible for merchant pricing, product availability, or tracking failures outside our control.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Transparency</h2>
              <p>We provide this disclosure in keeping with the U.S. Federal Trade Commission (FTC) guidelines on endorsements and affiliate relationships. Our goal is to be clear about how VPath Rewards earns money and how that benefits our members.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. More Information</h2>
              <p>
                For more detail, please review our{' '}
                <Link to="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
                Questions? Contact us at{' '}
                <a href="mailto:support@vpathrewards.store" className="text-primary-600 hover:underline">support@vpathrewards.store</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateDisclosure;
