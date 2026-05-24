import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';
import Pagination from '../../components/Pagination';
import LazyImage from '../../components/LazyImage';

interface Merchant {
  id: number;
  name: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  category?: string;
  cj_advertiser_id?: string | null;
  offer_count?: number;
  active_offer_count?: number;
  avg_cashback_rate?: number | null;
}

const AdminMerchants = () => {
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    website_url: '',
    category: '',
  });

  // Debounce the search input so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever a filter changes — otherwise we'd request a
  // page that no longer exists in the filtered result set.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    fetchMerchants();
  }, [isAuthenticated, navigate, currentPage, debouncedSearch, categoryFilter]);

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/merchants', {
        params: {
          page: currentPage,
          limit: 20,
          search: debouncedSearch || undefined,
          category: categoryFilter || undefined,
        },
      });

      if (response.data?.data) {
        setMerchants(response.data.data);
        setPagination(response.data.pagination);
        if (Array.isArray(response.data.categories)) {
          setCategories(response.data.categories);
        }
      } else {
        setMerchants(response.data || []);
        setPagination(null);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (merchant?: Merchant) => {
    if (merchant) {
      setEditingMerchant(merchant);
      setFormData({
        name: merchant.name,
        description: merchant.description || '',
        logo_url: merchant.logo_url || '',
        website_url: merchant.website_url || '',
        category: merchant.category || '',
      });
    } else {
      setEditingMerchant(null);
      setFormData({
        name: '',
        description: '',
        logo_url: '',
        website_url: '',
        category: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMerchant(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMerchant) {
        await apiClient.put(`/admin/merchants/${editingMerchant.id}`, formData);
      } else {
        await apiClient.post('/admin/merchants', formData);
      }
      fetchMerchants();
      handleCloseModal();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving merchant');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this merchant?')) return;
    try {
      await apiClient.delete(`/admin/merchants/${id}`);
      fetchMerchants();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting merchant');
    }
  };

  const hasFilters = useMemo(
    () => Boolean(debouncedSearch || categoryFilter),
    [debouncedSearch, categoryFilter]
  );

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Merchants</h1>
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
          >
            + Add Merchant
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchants by name…"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div className="sm:w-64">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : merchants.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            {hasFilters
              ? 'No merchants match your filters.'
              : 'No merchants yet. Click + Add Merchant to create one.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CJ Link</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {merchants.map((merchant) => {
                    const offerCount = merchant.offer_count ?? 0;
                    const activeOffers = merchant.active_offer_count ?? 0;
                    const avgRate = merchant.avg_cashback_rate;
                    const cjLinked = Boolean(merchant.cj_advertiser_id);

                    return (
                      <tr key={merchant.id}>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start max-w-md">
                            {merchant.logo_url && (
                              <LazyImage
                                src={merchant.logo_url}
                                alt={merchant.name}
                                className="w-10 h-10 object-contain mr-3 shrink-0"
                                width={40}
                                height={40}
                                fallback="https://via.placeholder.com/40"
                              />
                            )}
                            <div className="min-w-0">
                              <div
                                className="text-sm font-medium text-gray-900 truncate"
                                title={merchant.name}
                              >
                                {merchant.name}
                              </div>
                              {merchant.description && (
                                <div
                                  className="text-sm text-gray-500 line-clamp-2"
                                  title={merchant.description}
                                >
                                  {merchant.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {merchant.category || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {offerCount === 0 ? (
                            <span className="text-gray-400">0</span>
                          ) : (
                            <span>
                              {activeOffers}
                              {activeOffers !== offerCount && (
                                <span className="text-gray-400"> / {offerCount}</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {avgRate == null ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            `${avgRate.toFixed(1)}%`
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {cjLinked ? (
                            <button
                              onClick={() => navigate('/admin/cj')}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200"
                              title={`CJ advertiser ${merchant.cj_advertiser_id}`}
                            >
                              ✓ Linked
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate('/admin/cj')}
                              className="text-xs text-gray-500 hover:text-primary-600 underline"
                            >
                              Link…
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleOpenModal(merchant)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(merchant.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={pagination.total}
                />
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold mb-4">
                {editingMerchant ? 'Edit Merchant' : 'Add Merchant'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                    <input
                      type="url"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Website URL</label>
                    <input
                      type="url"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      list="merchant-categories"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                    <datalist id="merchant-categories">
                      {categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="mt-6 flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    {editingMerchant ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMerchants;
