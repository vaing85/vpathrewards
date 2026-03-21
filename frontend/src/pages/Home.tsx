import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Offer {
  id: number;
  title: string;
  cashback_rate: number;
  merchant_name?: string;
  merchant_logo?: string;
}

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [previewOffers, setPreviewOffers] = useState<Offer[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }
    apiClient.get('/featured/offers', { params: { limit: 6 } })
      .then((r) => setPreviewOffers(r.data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Get Paid to Shop.<br />
            <span className="text-primary-200">Real Cash. Every Time.</span>
          </h1>
          <p className="text-lg sm:text-xl mb-10 text-primary-100 max-w-xl mx-auto">
            Earn cash back at top travel, shopping, and lifestyle brands — just by clicking through our links.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-50 transition shadow-lg"
            >
              Sign Up Free →
            </Link>
            <Link
              to="/search"
              className="border-2 border-white/60 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition"
            >
              Browse Deals
            </Link>
          </div>
          <p className="mt-8 text-primary-300 text-sm">Free to join &nbsp;·&nbsp; No credit card needed &nbsp;·&nbsp; Withdraw anytime</p>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { n: '1', icon: '🚀', title: 'Sign Up Free', desc: 'Create your account in seconds.' },
              { n: '2', icon: '🛒', title: 'Shop Through Us', desc: 'Click any offer and shop as usual.' },
              { n: '3', icon: '💰', title: 'Get Cash Back', desc: 'Real money deposited to your account.' },
            ].map((s) => (
              <div key={s.n} className="flex flex-col items-center">
                <div className="text-4xl mb-3">{s.icon}</div>
                <div className="bg-primary-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-3">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Deal Teaser (locked for guests) ── */}
      <div className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800">Today's Top Deals</h2>
            <p className="text-gray-500 mt-2">
              {isAuthenticated ? 'Your active cashback offers' : 'Sign up free to unlock all deals'}
            </p>
          </div>

          <div className="relative">
            {/* Offer grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${!isAuthenticated ? 'select-none' : ''}`}>
              {previewOffers.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                  ))
                : previewOffers.map((offer, i) => (
                    <div
                      key={offer.id}
                      className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm transition ${
                        !isAuthenticated && i >= 3 ? 'blur-sm pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {offer.merchant_logo ? (
                          <img src={offer.merchant_logo} alt={offer.merchant_name} className="w-8 h-8 object-contain rounded" />
                        ) : (
                          <div className="w-8 h-8 bg-primary-100 rounded flex items-center justify-center text-xs font-bold text-primary-600">
                            {(offer.merchant_name || 'M')[0]}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-600">{offer.merchant_name}</span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium leading-snug mb-3 line-clamp-2">{offer.title}</p>
                      <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                        {offer.cashback_rate}% Cash Back
                      </span>
                    </div>
                  ))}
            </div>

            {/* Signup gate overlay for guests */}
            {!isAuthenticated && (
              <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-white via-white/90 to-transparent flex flex-col items-center justify-end pb-4">
                <p className="text-gray-700 font-semibold mb-3 text-lg">Sign up free to see all deals</p>
                <Link
                  to="/register"
                  className="bg-primary-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-700 transition shadow-md"
                >
                  Create Free Account →
                </Link>
                <p className="text-gray-400 text-xs mt-3">Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Log in</Link></p>
              </div>
            )}
          </div>

          {isAuthenticated && (
            <div className="text-center mt-8">
              <Link to="/search" className="text-primary-600 hover:text-primary-700 font-semibold">
                View all deals →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-14">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3">Start Earning Today</h2>
          <p className="text-primary-200 mb-8">Free membership. Real cash back. No catches.</p>
          <Link
            to="/register"
            className="bg-white text-primary-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-primary-50 transition shadow-lg inline-block"
          >
            Join Free →
          </Link>
        </div>
      </div>

    </div>
  );
};

export default Home;
