import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import FavoriteButton from '../components/FavoriteButton';
import ShareButton from '../components/ShareButton';
import LazyImage from '../components/LazyImage';

// Get or create session ID for tracking
const getOrCreateSessionId = (): string => {
  let sessionId = localStorage.getItem('tracking_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('tracking_session_id', sessionId);
  }
  return sessionId;
};

interface Offer {
  id: number;
  title: string;
  description?: string;
  cashback_rate: number;
  cashback_type?: string;
  merchant_name?: string;
  merchant_logo?: string;
  merchant_website?: string;
  terms?: string;
  affiliate_link?: string;
  category?: string;
  end_date?: string;
}

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const response = await apiClient.get(`/offers/${id}`);
        setOffer(response.data);
      } catch (error) {
        console.error('Error fetching offer:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [id]);

  const handleActivateOffer = async () => {
    if (!isAuthenticated) {
      alert('Please login to activate this offer');
      return;
    }
    if (offer?.affiliate_link && offer?.id) {
      try {
        // Track the click
        const response = await apiClient.post('/tracking/click', {
          offer_id: offer.id,
          session_id: getOrCreateSessionId()
        });
        
        // Open affiliate link with tracking
        const trackingUrl = response.data.tracking_url || offer.affiliate_link;
        window.open(trackingUrl, '_blank');
      } catch (error) {
        console.error('Error tracking click:', error);
        // Still open the link even if tracking fails
        window.open(offer.affiliate_link, '_blank');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Offer not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-start space-x-6 mb-6">
            {offer.merchant_logo && (
              <LazyImage
                src={offer.merchant_logo}
                alt={offer.merchant_name || 'Merchant'}
                className="w-20 h-20 object-contain rounded"
                width={80}
                height={80}
                fallback="https://placehold.co/80"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{offer.merchant_name}</h1>
              <p className="text-xl text-gray-600">{offer.title}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FavoriteButton offerId={offer.id} size="lg" />
                <ShareButton
                  offerId={offer.id}
                  title={`${offer.merchant_name} - ${offer.title}`}
                  cashbackRate={offer.cashback_rate}
                  size="lg"
                />
              </div>
              <div className="bg-primary-600 text-white px-6 py-4 rounded-lg text-center">
                <div className="text-4xl font-bold">
                  {offer.cashback_type === 'flat' ? `$${offer.cashback_rate}` : `${offer.cashback_rate}%`}
                </div>
                <div className="text-sm">{offer.cashback_type === 'flat' ? 'Flat Cashback' : 'Cashback'}</div>
              </div>
            </div>
          </div>
          {offer.end_date && (
            <p className="text-amber-600 font-medium mb-4">
              Ends {new Date(offer.end_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}

          {offer.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Description</h2>
              <p className="text-gray-600">{offer.description}</p>
            </div>
          )}

          {offer.terms && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Terms & Conditions</h2>
              <p className="text-gray-600">{offer.terms}</p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            {!isAuthenticated ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 mb-2">
                  Please <Link to="/login" className="font-semibold underline">login</Link> or{' '}
                  <Link to="/register" className="font-semibold underline">sign up</Link> to activate this offer.
                </p>
              </div>
            ) : null}
            <button
              onClick={handleActivateOffer}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-lg text-lg transition"
            >
              {isAuthenticated ? 'Activate Offer & Shop Now' : 'Login to Activate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferDetail;
