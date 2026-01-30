import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

interface FavoriteButtonProps {
  offerId?: number;
  merchantId?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const FavoriteButton = ({ offerId, merchantId, size = 'md', showLabel = false }: FavoriteButtonProps) => {
  const { isAuthenticated } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated && (offerId || merchantId)) {
      checkFavoriteStatus();
    } else {
      setChecking(false);
    }
  }, [isAuthenticated, offerId, merchantId]);

  const checkFavoriteStatus = async () => {
    try {
      const params: any = {};
      if (offerId) params.offer_id = offerId;
      if (merchantId) params.merchant_id = merchantId;

      const response = await apiClient.get('/favorites/check', { params });
      setIsFavorited(response.data.is_favorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // Could redirect to login or show a message
      return;
    }

    setLoading(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        const params: any = {};
        if (offerId) params.offer_id = offerId;
        if (merchantId) params.merchant_id = merchantId;

        await apiClient.delete('/favorites', { params });
        setIsFavorited(false);
      } else {
        // Add to favorites
        const body: any = {};
        if (offerId) body.offer_id = offerId;
        if (merchantId) body.merchant_id = merchantId;

        await apiClient.post('/favorites', body);
        setIsFavorited(true);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      alert(error.response?.data?.error || 'Failed to update favorite');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Don't show favorite button if not logged in
  }

  if (checking) {
    return (
      <button
        className={`${size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'} text-gray-400`}
        disabled
      >
        <svg className="animate-spin h-full w-full" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </button>
    );
  }

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`${sizeClasses[size]} ${
        isFavorited ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
      } transition-colors duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        className="w-full h-full"
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {showLabel && (
        <span className="ml-2 text-sm">
          {isFavorited ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </button>
  );
};

export default FavoriteButton;
