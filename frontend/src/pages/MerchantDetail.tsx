import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
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
  end_date?: string;
}

interface Review {
  id: number;
  user_id: number;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

const MerchantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReviews = () => {
    if (!id) return;
    apiClient.get(`/merchants/${id}/reviews`).then((res) => {
      setReviews(res.data.reviews || []);
      setAverageRating(res.data.average_rating ?? null);
      setReviewCount(res.data.total_count ?? 0);
    }).catch(() => {});
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [merchantRes, offersRes] = await Promise.all([
          apiClient.get(`/merchants/${id}`),
          apiClient.get(`/merchants/${id}/offers`),
        ]);
        setMerchant(merchantRes.data);
        setOffers(offersRes.data);
        fetchReviews();
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

        {/* Reviews section (Phase 3) */}
        <div className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Reviews</h2>
            {averageRating != null && (
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= Math.round(averageRating) ? '' : 'opacity-30'}>★</span>
                  ))}
                </div>
                <span className="text-gray-600 font-medium">{averageRating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
              </div>
            )}
          </div>

          {isAuthenticated && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Leave a review</h3>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Rating</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>{r} ★</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-gray-600 mb-1">Comment (optional)</label>
                  <input
                    type="text"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Share your experience..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <button
                  onClick={async () => {
                    setSubmittingReview(true);
                    try {
                      await apiClient.post(`/merchants/${id}/reviews`, { rating: reviewForm.rating, comment: reviewForm.comment || undefined });
                      fetchReviews();
                      setReviewForm({ rating: 5, comment: '' });
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setSubmittingReview(false);
                    }
                  }}
                  disabled={submittingReview}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No reviews yet. {isAuthenticated ? 'Be the first to review!' : 'Log in to leave a review.'}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{r.user_name}</span>
                      <span className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <span className="text-gray-400 text-sm">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-gray-600 text-sm">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantDetail;
