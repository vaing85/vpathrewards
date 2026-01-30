import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import OfferCard from '../components/OfferCard';
import MerchantCard from '../components/MerchantCard';
import FavoriteButton from '../components/FavoriteButton';

interface FavoriteItem {
  id: number;
  favorite_id: number;
  type: 'offer' | 'merchant';
  favorited_at: string;
  // Offer fields
  title?: string;
  description?: string;
  cashback_rate?: number;
  merchant_name?: string;
  merchant_logo?: string;
  terms?: string;
  // Merchant fields
  name?: string;
  logo_url?: string;
  category?: string;
  offer_count?: number;
  max_cashback?: number;
}

const Favorites = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'offers' | 'merchants'>('all');
  const [counts, setCounts] = useState({ offers_count: 0, merchants_count: 0, total_count: 0 });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchFavorites();
    fetchCounts();
  }, [isAuthenticated, navigate, activeTab]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const type = activeTab === 'all' ? undefined : activeTab;
      const response = await apiClient.get('/favorites', {
        params: type ? { type } : {}
      });
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const response = await apiClient.get('/favorites/count');
      setCounts(response.data);
    } catch (error) {
      console.error('Error fetching favorites count:', error);
    }
  };

  const handleRemoveFavorite = async (favoriteId: number, itemId: number, type: 'offer' | 'merchant') => {
    try {
      const params: any = { favorite_id: favoriteId };
      if (type === 'offer') {
        params.offer_id = itemId;
      } else {
        params.merchant_id = itemId;
      }

      await apiClient.delete('/favorites', { params });
      // Refresh favorites list
      fetchFavorites();
      fetchCounts();
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (!isAuthenticated) return null;

  const offerFavorites = favorites.filter(f => f.type === 'offer');
  const merchantFavorites = favorites.filter(f => f.type === 'merchant');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Favorites</h1>
          <p className="text-gray-600">
            {counts.total_count} saved {counts.total_count === 1 ? 'item' : 'items'}
            {counts.offers_count > 0 && ` • ${counts.offers_count} offers`}
            {counts.merchants_count > 0 && ` • ${counts.merchants_count} merchants`}
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'all'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({counts.total_count})
              </button>
              <button
                onClick={() => setActiveTab('offers')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'offers'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Offers ({counts.offers_count})
              </button>
              <button
                onClick={() => setActiveTab('merchants')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'merchants'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Merchants ({counts.merchants_count})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No favorites yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start saving your favorite offers and merchants!
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Browse Offers
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Offers Section */}
            {(activeTab === 'all' || activeTab === 'offers') && offerFavorites.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Favorite Offers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {offerFavorites.map((favorite) => (
                    <div key={favorite.favorite_id} className="relative">
                      <OfferCard
                        offer={{
                          id: favorite.id,
                          title: favorite.title || '',
                          cashback_rate: favorite.cashback_rate || 0,
                          merchant_name: favorite.merchant_name,
                          merchant_logo: favorite.merchant_logo,
                          description: favorite.description,
                          terms: favorite.terms,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Merchants Section */}
            {(activeTab === 'all' || activeTab === 'merchants') && merchantFavorites.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Favorite Merchants</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {merchantFavorites.map((favorite) => (
                    <div key={favorite.favorite_id} className="relative">
                      <MerchantCard
                        merchant={{
                          id: favorite.id,
                          name: favorite.name || '',
                          description: favorite.description,
                          logo_url: favorite.logo_url,
                          category: favorite.category,
                          offer_count: favorite.offer_count,
                          max_cashback: favorite.max_cashback,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Favorites;
