import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

interface SearchResult {
  merchants: any[];
  offers: any[];
}

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        performSearch(searchTerm);
      } else {
        setResults(null);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const performSearch = async (term: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/search', {
        params: { q: term, type: 'all' }
      });
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setShowResults(false);
    }
  };

  const handleResultClick = (type: 'merchant' | 'offer', id: number) => {
    if (type === 'merchant') {
      navigate(`/merchants/${id}`);
    } else {
      navigate(`/offers/${id}`);
    }
    setShowResults(false);
    setSearchTerm('');
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl mx-4">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          placeholder="Search merchants, offers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (results) setShowResults(true);
          }}
          className="w-full px-4 py-2 pl-10 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          </div>
        )}
      </form>

      {/* Search Results Dropdown */}
      {showResults && results && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
          {results.merchants.length === 0 && results.offers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No results found</div>
          ) : (
            <>
              {results.merchants.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Merchants</div>
                  {results.merchants.map((merchant) => (
                    <div
                      key={merchant.id}
                      onClick={() => handleResultClick('merchant', merchant.id)}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded flex items-center space-x-3"
                    >
                      {merchant.logo_url && (
                        <img
                          src={merchant.logo_url}
                          alt={merchant.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{merchant.name}</div>
                        {merchant.max_cashback && (
                          <div className="text-xs text-primary-600">Up to {merchant.max_cashback}% cashback</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {results.offers.length > 0 && (
                <div className="p-2 border-t border-gray-200">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Offers</div>
                  {results.offers.map((offer) => (
                    <div
                      key={offer.id}
                      onClick={() => handleResultClick('offer', offer.id)}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {offer.merchant_logo && (
                          <img
                            src={offer.merchant_logo}
                            alt={offer.merchant_name}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{offer.merchant_name}</div>
                          <div className="text-sm text-gray-500">{offer.title}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-primary-600">{offer.cashback_rate}%</div>
                    </div>
                  ))}
                </div>
              )}
              {searchTerm.trim() && (
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                      setShowResults(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-primary-600 hover:bg-gray-100 rounded text-center"
                  >
                    View all results for "{searchTerm}"
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
