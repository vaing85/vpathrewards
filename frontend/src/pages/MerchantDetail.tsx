import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import OfferCard from '../components/OfferCard';
import FavoriteButton from '../components/FavoriteButton';
import ShareButton from '../components/ShareButton';
import LazyImage from '../components/LazyImage';

interface Merchant {
  id: number;
  name: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  category?: string;
}

interface Offer {
  id: number;
  title: string;
  description?: string;
  cashback_rate: number;
  merchant_name?: string;
  merchant_logo?: string;
  terms?: string;
  affiliate_link?: string;
}

const MerchantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [merchantRes, offersRes] = await Promise.all([
          apiClient.get(`/merchants/${id}`),
          apiClient.get(`/merchants/${id}/offers`),
        ]);
        setMerchant(merchantRes.data);
        setOffers(offersRes.data);
      } catch (error) {
        console.error('Error fetching merchant data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Merchant not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-6">
            {merchant.logo_url && (
              <LazyImage
                src={merchant.logo_url}
                alt={merchant.name}
                className="w-24 h-24 object-contain rounded"
                width={96}
                height={96}
                fallback="https://via.placeholder.com/96"
              />
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-800 mb-2">{merchant.name}</h1>
                  {merchant.description && (
                    <p className="text-gray-600 text-lg">{merchant.description}</p>
                  )}
                  {merchant.category && (
                    <span className="inline-block mt-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                      {merchant.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <FavoriteButton merchantId={merchant.id} size="lg" />
                  <ShareButton
                    merchantId={merchant.id}
                    title={merchant.name}
                    description={merchant.description}
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Offers</h2>
        {offers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No active offers at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDetail;
