import { useState, useEffect } from 'react';
import apiClient from '../api/client';

interface FilterProps {
  onFilterChange: (filters: FilterState) => void;
  onSortChange: (sort: string) => void;
}

export interface FilterState {
  category: string;
  minCashback: string;
  maxCashback: string;
  sort: string;
}

const Filters = ({ onFilterChange, onSortChange }: FilterProps) => {
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    minCashback: '',
    maxCashback: '',
    sort: 'cashback_desc'
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/search/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSortChange = (sort: string) => {
    setFilters({ ...filters, sort });
    onSortChange(sort);
  };

  const clearFilters = () => {
    const clearedFilters = {
      category: '',
      minCashback: '',
      maxCashback: '',
      sort: 'cashback_desc'
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
    onSortChange('cashback_desc');
  };

  const hasActiveFilters = filters.category || filters.minCashback || filters.maxCashback || filters.sort !== 'cashback_desc';

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      {/* Mobile Toggle */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 rounded-lg"
        >
          <span className="font-medium">Filters & Sort</span>
          <svg
            className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Filter Content */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:block space-y-4`}>
        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <select
            value={filters.sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="cashback_desc">Highest Cashback</option>
            <option value="cashback_asc">Lowest Cashback</option>
            <option value="name">Merchant Name</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cashback Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cashback Rate</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                placeholder="Min %"
                min="0"
                max="100"
                step="0.1"
                value={filters.minCashback}
                onChange={(e) => handleFilterChange('minCashback', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Max %"
                min="0"
                max="100"
                step="0.1"
                value={filters.maxCashback}
                onChange={(e) => handleFilterChange('maxCashback', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default Filters;
