import { Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import LazyImage from './LazyImage';

interface Offer {
  id: number;
  title: string;
  description?: string;
  cashback_rate: number;
  cashback_type?: string;
  merchant_name?: string;
  merchant_logo?: string;
  terms?: string;
  category?: string;
  end_date?: string;
}

interface OfferCardProps {
  offer: Offer;
}

const OfferCard = ({ offer }: OfferCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-200 relative">
      <div className="absolute top-4 right-4 z-10">
        <FavoriteButton offerId={offer.id} size="md" />
      </div>

      {/* Category tag — outside the main link to avoid nesting <a> inside <a> */}
      {offer.category && (
        <div className="px-6 pt-4 pb-0">
          <Link
            to={`/category/${encodeURIComponent(offer.category)}`}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition"
          >
            {offer.category}
          </Link>
        </div>
      )}

      <Link to={`/offers/${offer.id}`} className="block p-6 pt-3">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {offer.merchant_logo && (
              <LazyImage
                src={offer.merchant_logo}
                alt={offer.merchant_name || 'Merchant'}
                className="w-12 h-12 object-contain rounded flex-shrink-0"
                width={48}
                height={48}
                fallback="https://placehold.co/48"
              />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-800 truncate">{offer.merchant_name}</h3>
              <p className="text-sm text-gray-500 truncate">{offer.title}</p>
            </div>
          </div>
          <div className="bg-primary-600 text-white px-4 py-2 rounded-lg flex-shrink-0 text-center">
            <div className="text-2xl font-bold">
              {offer.cashback_type === 'flat' ? `$${offer.cashback_rate}` : `${offer.cashback_rate}%`}
            </div>
            <div className="text-xs">Cashback</div>
          </div>
        </div>
        {offer.end_date && (
          <p className="text-amber-600 text-xs font-medium mb-2">
            Ends {new Date(offer.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {offer.description && (
          <p className="text-gray-600 text-sm mb-3">{offer.description}</p>
        )}
        {offer.terms && (
          <p className="text-gray-500 text-xs italic">{offer.terms}</p>
        )}
      </Link>
    </div>
  );
};

export default OfferCard;
