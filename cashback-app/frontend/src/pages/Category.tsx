import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import OfferCard from '../components/OfferCard';
import Pagination from '../components/Pagination';

interface Offer {
  id: number;
  title: string;
  description?: string;
  cashback_rate: number;
  merchant_name?: string;
  merchant_logo?: string;
  terms?: string;
  category?: string;
}

const Category = () => {
  const { category } = useParams<{ category: string }>();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('cashback_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    if (category) {
      setCurrentPage(1); // Reset to page 1 when category or sort changes
      fetchCategoryOffers();
    }
  }, [category, sort]);

  useEffect(() => {
    if (category) {
      fetchCategoryOffers();
    }
  }, [currentPage]);

  const fetchCategoryOffers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/offers', {
        params: { 
          category: decodeURIComponent(category || ''),
          sort,
          page: currentPage,
          limit: 20
        }
      });
      
      // Handle paginated response
      if (response.data?.data) {
        setOffers(response.data.data);
        setPagination(response.data.pagination);
      } else {
        // Fallback for non-paginated response
        setOffers(response.data || []);
        setPagination(null);
      }
    } catch (error) {
      console.error('Error fetching category offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryName = category ? decodeURIComponent(category) : 'Category';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-sm text-gray-500 mb-4">
            <Link to="/" className="hover:text-primary-600">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">Category</span>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">{categoryName}</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{categoryName} Offers</h1>
          <p className="text-gray-600">Browse all cashback offers in {categoryName}</p>
        </div>

        {/* Sort Options */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {loading ? 'Loading...' : (
                pagination 
                  ? `${pagination.total} offers found (showing ${offers.length})`
                  : `${offers.length} offers found`
              )}
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="cashback_desc">Highest Cashback</option>
                <option value="cashback_asc">Lowest Cashback</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Offers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">No offers found in this category.</p>
            <Link
              to="/"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Browse all offers →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
                totalItems={pagination.total}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Category;
