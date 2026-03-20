import { useEffect, useState, useRef } from 'react';
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

interface Banner {
  id: number;
  image_url: string;
  click_url: string;
  width: number;
  height: number;
  alt_text?: string;
}

interface Review {
  id: number;
  user_id: number;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

// Groups banners by "WxH" key
function groupBannersBySize(banners: Banner[]): Banner[][] {
  const map = new Map<string, Banner[]>();
  for (const b of banners) {
    const key = `${b.width}x${b.height}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  return Array.from(map.values());
}

// Rotates through a list of same-size banners every 15s
const RotatingBanner = ({ group, merchantName }: { group: Banner[]; merchantName: string }) => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (group.length <= 1) return;
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % group.length);
        setFade(true);
      }, 300);
    }, 15000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [group.length]);

  const banner = group[index];
  return (
    <a
      href={banner.click_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{ display: 'block', transition: 'opacity 0.3s', opacity: fade ? 1 : 0 }}
    >
      <img
        src={banner.image_url}
        alt={banner.alt_text || merchantName}
        width={banner.width}
        height={banner.height}
        className="rounded shadow-sm"
        style={{ maxWidth: '100%' }}
      />
    </a>
  );
};

const MerchantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
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
        const [merchantRes, offersRes, bannersRes] = await Promise.all([
          apiClient.get(`/merchants/${id}`),
          apiClient.get(`/merchants/${id}/offers`),
          apiClient.get(`/merchants/${id}/banners`),
        ]);
        setMerchant(merchantRes.data);
        setOffers(offersRes.data);
        setBanners(bannersRes.data || []);
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

  // Group banners by size, then split into sidebar (≤300px wide) and wide
  const sidebarGroups = groupBannersBySize(banners.filter(b => b.width <= 300));
  const wideGroups = groupBannersBySize(banners.filter(b => b.width > 300));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                fallback=""
              />
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-800 mb-2">{merchant.name}</h1>
                  {merchant.description && (
                    <p className="text-gray-600 text-lg">{merchant.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {merchant.category && (
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                        {merchant.category}
                      </span>
                    )}
                    {merchant.website_url && (
                      <a
                        href={merchant.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline"
                      >
                        Visit website →
                      </a>
                    )}
                  </div>
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

      {/* Wide banners — one slot per size, rotating */}
      {wideGroups.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex flex-wrap gap-4 justify-center">
            {wideGroups.map((group) => (
              <RotatingBanner
                key={`${group[0].width}x${group[0].height}`}
                group={group}
                merchantName={merchant.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main content + sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`flex gap-8 ${sidebarGroups.length > 0 ? 'flex-col lg:flex-row' : ''}`}>

          {/* Offers + Reviews */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Available Offers
              <span className="ml-2 text-sm font-normal text-gray-500">({offers.length})</span>
            </h2>

            {offers.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">No active offers at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            )}

            {/* Reviews */}
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

          {/* Sidebar banners — one slot per size, rotating */}
          {sidebarGroups.length > 0 && (
            <div className="lg:w-64 shrink-0">
              <div className="sticky top-6 space-y-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Sponsored</p>
                {sidebarGroups.map((group) => (
                  <RotatingBanner
                    key={`${group[0].width}x${group[0].height}`}
                    group={group}
                    merchantName={merchant.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantDetail;
