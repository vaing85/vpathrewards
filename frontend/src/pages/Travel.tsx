import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import OfferCard from '../components/OfferCard';

interface Offer {
  id: number;
  title: string;
  description?: string;
  cashback_rate: number;
  merchant_name?: string;
  merchant_logo?: string;
}

interface Merchant {
  id: number;
  name: string;
  description?: string;
  website_url?: string;
  offer_count?: number;
}

const TRAVEL_BRANDS = [
  { name: 'Hotels.com', icon: '🏨', color: 'bg-red-50 border-red-200', badge: 'Up to 2% back' },
  { name: 'Vrbo',       icon: '🏡', color: 'bg-blue-50 border-blue-200', badge: 'Up to 1% back' },
  { name: 'Expedia',    icon: '✈️', color: 'bg-yellow-50 border-yellow-200', badge: 'Cash back on travel' },
];

const Travel = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/offers', { params: { category: 'Travel', limit: 50, sort: 'cashback_desc' } }),
      apiClient.get('/merchants', { params: { category: 'Travel', limit: 20 } }),
    ]).then(([offersRes, merchantsRes]) => {
      const offersData = offersRes.data?.data || offersRes.data || [];
      const merchantsData = merchantsRes.data?.data || merchantsRes.data || [];
      setOffers(offersData);
      setMerchants(merchantsData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredOffers = selectedBrand
    ? offers.filter(o => o.merchant_name?.toLowerCase().includes(selectedBrand.toLowerCase()))
    : offers;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="text-sm text-blue-200 mb-6">
            <Link to="/dashboard" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Travel</span>
          </nav>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">✈️</span>
            <div>
              <h1 className="text-4xl font-bold">Travel Cashback</h1>
              <p className="text-blue-200 text-lg mt-1">Earn real cash back on hotels, vacation rentals, and flights</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-8">
            {TRAVEL_BRANDS.map(brand => (
              <div key={brand.name} className="bg-white bg-opacity-10 backdrop-blur rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-2xl">{brand.icon}</span>
                <div>
                  <div className="font-semibold text-sm">{brand.name}</div>
                  <div className="text-xs text-blue-200">{brand.badge}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Brand filter */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Browse by Brand</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedBrand(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                !selectedBrand ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              All Brands
            </button>
            {merchants.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedBrand(selectedBrand === m.name ? null : m.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                  selectedBrand === m.name ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Offers grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {selectedBrand ? `${selectedBrand} Offers` : 'All Travel Offers'}
            <span className="ml-2 text-sm font-normal text-gray-500">({filteredOffers.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow">
            <span className="text-5xl mb-4 block">✈️</span>
            <p className="text-gray-500">No travel offers found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map(offer => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Travel;
