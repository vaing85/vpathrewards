import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-white text-lg font-bold mb-3">V PATHing Rewards</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Earn real cash back on every purchase at hundreds of top brands. Free to join, withdraw anytime.
            </p>
            <p className="text-xs text-gray-500 mt-4">
              Operated by V PATHing Enterprise LLC
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search" className="hover:text-white transition">Browse Offers</Link></li>
              <li><Link to="/search?category=Travel" className="hover:text-white transition">Travel Deals</Link></li>
              <li><Link to="/search?category=Shopping" className="hover:text-white transition">Shopping</Link></li>
              <li><Link to="/search?category=Food" className="hover:text-white transition">Food & Dining</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-white transition">Sign Up Free</Link></li>
              <li><Link to="/login" className="hover:text-white transition">Log In</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition">Dashboard</Link></li>
              <li><Link to="/withdrawals" className="hover:text-white transition">Withdrawals</Link></li>
              <li><Link to="/referrals" className="hover:text-white transition">Refer a Friend</Link></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li>
                <a href="mailto:support@vpathrewards.store" className="hover:text-white transition">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <p>© {currentYear} V PATHing Enterprise LLC. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-gray-300 transition">Terms</Link>
            <Link to="/privacy" className="hover:text-gray-300 transition">Privacy</Link>
            <a href="mailto:support@vpathrewards.store" className="hover:text-gray-300 transition">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
