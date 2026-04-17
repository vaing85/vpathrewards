import { Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import LazyImage from './LazyImage';

interface Offer {
  id: number;
  title: string;
  description?: string;
  cashback_rate: number;
  merchant_name?: string;
  merchant_logo?: string;
  terms?: string;
}

interface OfferCardProps {
  offer: Offer;
}

const OfferCard = ({ offer }: OfferCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-200 relative">
      <div className="absolute top-4 right-4 z-10">
        <FavoriteButton offerId={offer.id} size="md" />
      </div>
      <Link to={`/offers/${offer.id}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {offer.merchant_logo && (
              <LazyImage
                src={offer.merchant_logo}
                alt={offer.merchant_name || 'Merchant'}
                className="w-12 h-12 object-contain rounded"
                width={48}
                height={48}
                fallback="https://via.placeholder.com/48"
              />
            )}
            <div>
              <h3 className="font-semibold text-gray-800">{offer.merchant_name}</h3>
              <p className="text-sm text-gray-500">{offer.title}</p>
            </div>
          </div>
          <div className="bg-primary-600 text-white px-4 py-2 rounded-lg">
            <div className="text-2xl font-bold">{offer.cashback_rate}%</div>
            <div className="text-xs">Cashback</div>
          </div>
        </div>
        
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
