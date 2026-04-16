import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import MerchantCard from '../components/MerchantCard';
import OfferCard from '../components/OfferCard';
import Filters, { FilterState } from '../components/Filters';
import Pagination from '../components/Pagination';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [merchants, setMerchants] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [merchantPagination, setMerchantPagination] = useState<any>(null);
  const [offerPagination, setOfferPagination] = useState<any>(null);
  const [merchantPage, setMerchantPage] = useState(1);
  const [offerPage, setOfferPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'merchants' | 'offers'>('all');
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    minCashback: '',
    maxCashback: '',
    sort: 'cashback_desc'
  });

  useEffect(() => {
    setMerchantPage(1);
    setOfferPage(1);
    fetchResults();
  }, [query, filters]);

  useEffect(() => {
    fetchResults();
  }, [merchantPage, offerPage]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const merchantParams: any = { page: merchantPage, limit: 20 };
      const offerParams: any = { page: offerPage, limit: 20 };
      
      if (query) {
        merchantParams.search = query;
        offerParams.search = query;
      }
      if (filters.category) {
        merchantParams.category = filters.category;
        offerParams.category = filters.category;
      }
      if (filters.minCashback) {
        merchantParams.minCashback = filters.minCashback;
        offerParams.minCashback = filters.minCashback;
      }
      if (filters.maxCashback) {
        offerParams.maxCashback = filters.maxCashback;
      }
      if (filters.sort) {
        merchantParams.sort = filters.sort;
        offerParams.sort = filters.sort;
      }

      const promises: Promise<any>[] = [];
      
      if (activeTab === 'all' || activeTab === 'merchants') {
        promises.push(apiClient.get('/merchants', { params: merchantParams }));
      } else {
        promises.push(Promise.resolve({ data: { data: [], pagination: null } }));
      }
      
      if (activeTab === 'all' || activeTab === 'offers') {
        promises.push(apiClient.get('/offers', { params: offerParams }));
      } else {
        promises.push(Promise.resolve({ data: { data: [], pagination: null } }));
      }

      const [merchantsRes, offersRes] = await Promise.all(promises);

      // Handle paginated response
      if (merchantsRes.data?.data) {
        setMerchants(merchantsRes.data.data);
        setMerchantPagination(merchantsRes.data.pagination);
      } else {
        // Fallback for non-paginated response
        setMerchants(merchantsRes.data || []);
        setMerchantPagination(null);
      }

      if (offersRes.data?.data) {
        setOffers(offersRes.data.data);
        setOfferPagination(offersRes.data.pagination);
      } else {
        // Fallback for non-paginated response
        setOffers(offersRes.data || []);
        setOfferPagination(null);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleSortChange = (sort: string) => {
    setFilters({ ...filters, sort });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Search Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            {query ? `Search Results for "${query}"` : 'Browse All'}
          </h1>
          <p className="text-gray-600">
            {loading ? 'Loading...' : (
              <>
                {merchantPagination && `Found ${merchantPagination.total} merchants`}
                {merchantPagination && offerPagination && ' and '}
                {offerPagination && `Found ${offerPagination.total} offers`}
                {!merchantPagination && !offerPagination && `Found ${merchants.length} merchants and ${offers.length} offers`}
              </>
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => { setActiveTab('all'); setMerchantPage(1); setOfferPage(1); }}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'all'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setActiveTab('merchants'); setMerchantPage(1); }}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'merchants'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Merchants {merchantPagination && `(${merchantPagination.total})`}
            </button>
            <button
              onClick={() => { setActiveTab('offers'); setOfferPage(1); }}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'offers'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Offers {offerPagination && `(${offerPagination.total})`}
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Filters onFilterChange={handleFilterChange} onSortChange={handleSortChange} />
          </div>

          {/* Results */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : (
              <>
                {/* All Tab - Show Both */}
                {activeTab === 'all' && (
                  <>
                    {/* Offers Section */}
                    {offers.length > 0 && (
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                          Offers {offerPagination && `(${offerPagination.total})`}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {offers.map((offer) => (
                            <OfferCard key={offer.id} offer={offer} />
                          ))}
                        </div>
                        {offerPagination && offerPagination.totalPages > 1 && (
                          <Pagination
                            currentPage={offerPage}
                            totalPages={offerPagination.totalPages}
                            onPageChange={setOfferPage}
                            totalItems={offerPagination.total}
                          />
                        )}
                      </div>
                    )}

                    {/* Merchants Section */}
                    {merchants.length > 0 && (
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                          Merchants {merchantPagination && `(${merchantPagination.total})`}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {merchants.map((merchant) => (
                            <MerchantCard key={merchant.id} merchant={merchant} />
                          ))}
                        </div>
                        {merchantPagination && merchantPagination.totalPages > 1 && (
                          <Pagination
                            currentPage={merchantPage}
                            totalPages={merchantPagination.totalPages}
                            onPageChange={setMerchantPage}
                            totalItems={merchantPagination.total}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Merchants Only Tab */}
                {activeTab === 'merchants' && (
                  <>
                    {merchants.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {merchants.map((merchant) => (
                            <MerchantCard key={merchant.id} merchant={merchant} />
                          ))}
                        </div>
                        {merchantPagination && merchantPagination.totalPages > 1 && (
                          <Pagination
                            currentPage={merchantPage}
                            totalPages={merchantPagination.totalPages}
                            onPageChange={setMerchantPage}
                            totalItems={merchantPagination.total}
                          />
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">No merchants found.</p>
                        <p className="text-sm text-gray-400">Try adjusting your search or filters.</p>
                      </div>
                    )}
                  </>
                )}

                {/* Offers Only Tab */}
                {activeTab === 'offers' && (
                  <>
                    {offers.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {offers.map((offer) => (
                            <OfferCard key={offer.id} offer={offer} />
                          ))}
                        </div>
                        {offerPagination && offerPagination.totalPages > 1 && (
                          <Pagination
                            currentPage={offerPage}
                            totalPages={offerPagination.totalPages}
                            onPageChange={setOfferPage}
                            totalItems={offerPagination.total}
                          />
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">No offers found.</p>
                        <p className="text-sm text-gray-400">Try adjusting your search or filters.</p>
                      </div>
                    )}
                  </>
                )}

                {/* No Results */}
                {activeTab === 'all' && merchants.length === 0 && offers.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No results found.</p>
                    <p className="text-sm text-gray-400">Try adjusting your search or filters.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
