import { Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import LazyImage from './LazyImage';

interface Merchant {
  id: number;
  name: string;
  description?: string;
  logo_url?: string;
  category?: string;
  offer_count?: number;
  max_cashback?: number;
}

interface MerchantCardProps {
  merchant: Merchant;
}

const MerchantCard = ({ merchant }: MerchantCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-200 relative">
      <div className="absolute top-4 right-4 z-10">
        <FavoriteButton merchantId={merchant.id} size="md" />
      </div>
      <Link to={`/merchants/${merchant.id}`}>
        <div className="flex items-start space-x-4">
          {merchant.logo_url ? (
            <LazyImage
              src={merchant.logo_url}
              alt={merchant.name}
              className="w-16 h-16 object-contain rounded"
              width={64}
              height={64}
              fallback="https://via.placeholder.com/64"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-400">
                {merchant.name.charAt(0)}
              </span>
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-800 mb-1">
              {merchant.name}
            </h3>
            {merchant.description && (
              <p className="text-gray-600 text-sm mb-2">{merchant.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {merchant.max_cashback && (
                <div className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                  Up to {merchant.max_cashback}% Cashback
                </div>
              )}
              {merchant.category && (
                <Link
                  to={`/category/${encodeURIComponent(merchant.category)}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  {merchant.category}
                </Link>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default MerchantCard;
