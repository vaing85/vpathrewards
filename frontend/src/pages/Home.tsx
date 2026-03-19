import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import MerchantCard from '../components/MerchantCard';
import OfferCard from '../components/OfferCard';
import SearchBar from '../components/SearchBar';

interface Merchant {
  id: number;
  name: string;
  description?: string;
  logo_url?: string;
  category?: string;
  offer_count?: number;
  max_cashback?: number;
}

interface Offer {
  id: number;
  title: string;
  description?: string;
  cashback_rate: number;
  merchant_name?: string;
  merchant_logo?: string;
  terms?: string;
}

interface PlatformStats {
  total_users: number;
  total_cashback_paid: number;
  active_offers: number;
  total_merchants: number;
}

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    bonus: '+0%',
    color: 'gray',
    features: ['Standard cashback rates', 'Access to all offers', 'Withdrawal requests'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Silver',
    price: '$4.99',
    period: '/month',
    bonus: '+0.5%',
    color: 'blue',
    features: ['+0.5% bonus cashback', 'All Free features', 'Priority email support'],
    cta: 'Go Silver',
    highlighted: false,
  },
  {
    name: 'Gold',
    price: '$9.99',
    period: '/month',
    bonus: '+1.5%',
    color: 'yellow',
    features: ['+1.5% bonus cashback', 'All Silver features', 'Early access to new offers'],
    cta: 'Go Gold',
    highlighted: true,
  },
  {
    name: 'Platinum',
    price: '$19.99',
    period: '/month',
    bonus: '+3%',
    color: 'purple',
    features: ['+3% bonus cashback', 'All Gold features', 'Dedicated support', 'Exclusive platinum offers'],
    cta: 'Go Platinum',
    highlighted: false,
  },
];

const categories = [
  { name: 'Travel', icon: '✈️', description: 'Hotels, flights & car rentals' },
  { name: 'Shopping', icon: '🛍️', description: 'Clothing, electronics & more' },
  { name: 'Food', icon: '🍔', description: 'Restaurants & meal delivery' },
  { name: 'Health', icon: '💊', description: 'Pharmacy & wellness' },
  { name: 'Home', icon: '🏠', description: 'Furniture & home improvement' },
  { name: 'Entertainment', icon: '🎬', description: 'Streaming & events' },
];

const Home = () => {
  const [featuredOffers, setFeaturedOffers] = useState<Offer[]>([]);
  const [trendingMerchants, setTrendingMerchants] = useState<Merchant[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featuredRes, trendingRes, statsRes] = await Promise.all([
          apiClient.get('/featured/offers', { params: { limit: 6 } }),
          apiClient.get('/featured/merchants', { params: { limit: 6 } }),
          apiClient.get('/stats').catch(() => ({ data: null })),
        ]);
        setFeaturedOffers(featuredRes.data);
        setTrendingMerchants(trendingRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center">
            <span className="inline-block bg-white/20 text-white text-sm font-semibold px-4 py-1 rounded-full mb-6">
              🎉 Join thousands earning cashback every day
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Earn Cash Back on<br />Every Purchase
            </h1>
            <p className="text-lg sm:text-xl mb-10 text-primary-100 max-w-2xl mx-auto">
              Shop at hundreds of top brands and get real money back. Travel, shop, dine — and get paid for it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-50 transition shadow-lg"
              >
                Start Earning Free →
              </Link>
              <Link
                to="/search"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition"
              >
                Browse Offers
              </Link>
            </div>
            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-primary-200">
              <span>✅ No credit card required</span>
              <span>✅ Free to join</span>
              <span>✅ Withdraw anytime</span>
              <span>✅ 100% secure</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Search ── */}
      <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
        <SearchBar />
      </div>

      {/* ── Platform Stats ── */}
      {stats && (stats.total_users > 0 || stats.total_cashback_paid > 0) && (
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-wrap justify-center gap-8 sm:gap-16 text-center">
              {stats.total_users > 0 && (
                <div>
                  <p className="text-2xl font-bold text-primary-600">{stats.total_users.toLocaleString()}+</p>
                  <p className="text-sm text-gray-500">Members</p>
                </div>
              )}
              {stats.total_cashback_paid > 0 && (
                <div>
                  <p className="text-2xl font-bold text-green-600">${stats.total_cashback_paid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}+</p>
                  <p className="text-sm text-gray-500">Cashback Paid</p>
                </div>
              )}
              {stats.active_offers > 0 && (
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stats.active_offers}+</p>
                  <p className="text-sm text-gray-500">Active Offers</p>
                </div>
              )}
              {stats.total_merchants > 0 && (
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stats.total_merchants}+</p>
                  <p className="text-sm text-gray-500">Partner Stores</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── How It Works ── */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">How It Works</h2>
            <p className="text-gray-500 mt-2">Start earning in 3 easy steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Sign Up Free', desc: 'Create your account in seconds. No credit card required.', icon: '🚀' },
              { step: '2', title: 'Shop Through Us', desc: 'Click on offers and shop at your favorite stores as usual.', icon: '🛒' },
              { step: '3', title: 'Get Paid', desc: 'Earn real cash back on every purchase. Withdraw anytime.', icon: '💰' },
            ].map((item) => (
              <div key={item.step} className="text-center p-8 rounded-2xl bg-gray-50 hover:bg-primary-50 transition">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="bg-primary-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Categories ── */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">Shop Every Category</h2>
            <p className="text-gray-500 mt-2">Earn cashback across hundreds of top brands</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={`/search?category=${cat.name}`}
                className="bg-white rounded-2xl p-6 text-center hover:shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <div className="text-4xl mb-3">{cat.icon}</div>
                <h3 className="font-semibold text-gray-800 text-sm">{cat.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{cat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Featured Offers ── */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Featured Offers</h2>
              <p className="text-gray-500 mt-1">Highest cashback rates available today</p>
            </div>
            <Link to="/search" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
              View All →
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading offers...</div>
          ) : featuredOffers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No featured offers available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Trending Merchants ── */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Trending Stores</h2>
              <p className="text-gray-500 mt-1">Most popular stores right now</p>
            </div>
            <Link to="/search" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
              View All →
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading merchants...</div>
          ) : trendingMerchants.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Check back soon — new stores are being added!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingMerchants.map((merchant) => (
                <MerchantCard key={merchant.id} merchant={merchant} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Coming Soon Partners ── */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Launching Soon</span>
            <h2 className="text-3xl font-bold text-gray-800 mt-3">Our Upcoming Partners</h2>
            <p className="text-gray-500 mt-2">Top travel & lifestyle brands coming to V PATHing Rewards</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Expedia', logo: 'https://logo.clearbit.com/expedia.com', category: 'Travel' },
              { name: 'Hotels.com', logo: 'https://logo.clearbit.com/hotels.com', category: 'Hotels' },
              { name: 'Priceline', logo: 'https://logo.clearbit.com/priceline.com', category: 'Travel' },
              { name: 'Enterprise', logo: 'https://logo.clearbit.com/enterprise.com', category: 'Car Rental' },
              { name: 'Hertz', logo: 'https://logo.clearbit.com/hertz.com', category: 'Car Rental' },
              { name: 'Budget', logo: 'https://logo.clearbit.com/budget.com', category: 'Car Rental' },
              { name: 'Avis', logo: 'https://logo.clearbit.com/avis.com', category: 'Car Rental' },
              { name: 'Booking.com', logo: 'https://logo.clearbit.com/booking.com', category: 'Hotels' },
              { name: 'Travelocity', logo: 'https://logo.clearbit.com/travelocity.com', category: 'Travel' },
              { name: 'Hilton', logo: 'https://logo.clearbit.com/hilton.com', category: 'Hotels' },
              { name: 'Marriott', logo: 'https://logo.clearbit.com/marriott.com', category: 'Hotels' },
              { name: 'Trivago', logo: 'https://logo.clearbit.com/trivago.com', category: 'Travel' },
            ].map((brand) => (
              <div key={brand.name} className="relative flex flex-col items-center bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all group">
                <div className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-3 shadow-sm overflow-hidden">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-sm font-semibold text-gray-700 text-center">{brand.name}</p>
                <p className="text-xs text-gray-400 text-center">{brand.category}</p>
                <span className="mt-2 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">Coming Soon</span>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-sm mt-8">
            More brands added every week. <Link to="/register" className="text-primary-600 hover:underline font-medium">Sign up free</Link> to get notified.
          </p>
        </div>
      </div>

      {/* ── Membership Tiers ── */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">Choose Your Plan</h2>
            <p className="text-gray-500 mt-2">Upgrade for bigger cashback bonuses on every purchase</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border-2 flex flex-col ${
                  plan.highlighted
                    ? 'border-yellow-400 bg-yellow-50 shadow-xl scale-105'
                    : 'border-gray-200 bg-white hover:shadow-md'
                } transition-all`}
              >
                {plan.highlighted && (
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full self-start mb-3">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <span className="text-green-600 font-semibold text-sm mb-4">{plan.bonus} cashback bonus</span>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`text-center py-3 rounded-lg font-semibold text-sm transition ${
                    plan.highlighted
                      ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Start Earning?</h2>
          <p className="text-primary-100 text-lg mb-8">
            Join V PATHing Rewards today — it's free and takes less than a minute.
          </p>
          <Link
            to="/register"
            className="bg-white text-primary-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-primary-50 transition shadow-lg inline-block"
          >
            Create Free Account →
          </Link>
        </div>
      </div>

    </div>
  );
};

export default Home;
