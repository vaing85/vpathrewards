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

const Home = () => {
  const [featuredOffers, setFeaturedOffers] = useState<Offer[]>([]);
  const [trendingMerchants, setTrendingMerchants] = useState<Merchant[]>([]);
  const [recentOffers, setRecentOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featuredRes, trendingRes, recentRes] = await Promise.all([
          apiClient.get('/featured/offers', { params: { limit: 6 } }),
          apiClient.get('/featured/merchants', { params: { limit: 6 } }),
          apiClient.get('/featured/recent-offers', { params: { limit: 6 } }),
        ]);
        setFeaturedOffers(featuredRes.data);
        setTrendingMerchants(trendingRes.data);
        setRecentOffers(recentRes.data);
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
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Earn Cashback on Every Purchase
            </h1>
            <p className="text-base sm:text-lg md:text-xl mb-8 text-primary-100">
              Shop at your favorite stores and get money back. It's that simple.
            </p>
            <Link
              to="/register"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-primary-50 transition inline-block"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-8">
        <SearchBar />
      </div>

      {/* Featured Offers Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Featured Offers</h2>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Highest cashback rates available</p>
          </div>
          <Link
            to="/search"
            className="text-primary-600 hover:text-primary-700 font-semibold text-sm whitespace-nowrap"
          >
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : featuredOffers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No featured offers available</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>

      {/* Trending Merchants Section */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Trending Merchants</h2>
              <p className="text-gray-600 mt-1">Most popular stores right now</p>
            </div>
            <Link
              to="/search"
              className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
            >
              View All →
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : trendingMerchants.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No trending merchants available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingMerchants.map((merchant) => (
                <MerchantCard key={merchant.id} merchant={merchant} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently Added Offers Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">New Offers</h2>
            <p className="text-gray-600 mt-1">Recently added cashback opportunities</p>
          </div>
          <Link
            to="/search"
            className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
          >
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : recentOffers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No recent offers available</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Sign Up Free</h3>
              <p className="text-gray-600">
                Create your account in seconds. No credit card required.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Shop Through Us</h3>
              <p className="text-gray-600">
                Click on offers and shop at your favorite stores as usual.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Cashback</h3>
              <p className="text-gray-600">
                Earn money back on every purchase. Withdraw anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
