import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';
import Pagination from '../../components/Pagination';

interface Offer {
  id: number;
  merchant_id: number;
  title: string;
  description?: string;
  cashback_rate: number;
  terms?: string;
  affiliate_link: string;
  is_active: number;
  merchant_name?: string;
  end_date?: string;
}

interface Merchant {
  id: number;
  name: string;
}

const AdminOffers = () => {
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [formData, setFormData] = useState({
    merchant_id: '',
    title: '',
    description: '',
    cashback_rate: '',
    terms: '',
    affiliate_link: '',
    is_active: true,
    end_date: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate, currentPage]);

  const fetchData = async () => {
    try {
      const [offersRes, merchantsRes] = await Promise.all([
        apiClient.get('/admin/offers', { params: { page: currentPage, limit: 20 } }),
        apiClient.get('/admin/merchants', { params: { limit: 1000 } }), // Get all merchants for dropdown
      ]);
      
      // Handle paginated offers response
      if (offersRes.data?.data) {
        setOffers(offersRes.data.data);
        setPagination(offersRes.data.pagination);
      } else {
        setOffers(offersRes.data || []);
        setPagination(null);
      }
      
      // Handle merchants (may or may not be paginated)
      if (merchantsRes.data?.data) {
        setMerchants(merchantsRes.data.data);
      } else {
        setMerchants(merchantsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (offer?: Offer) => {
    if (offer) {
      setEditingOffer(offer);
      setFormData({
        merchant_id: offer.merchant_id.toString(),
        title: offer.title,
        description: offer.description || '',
        cashback_rate: offer.cashback_rate.toString(),
        terms: offer.terms || '',
        affiliate_link: offer.affiliate_link,
        is_active: offer.is_active === 1,
        end_date: offer.end_date ? offer.end_date.slice(0, 10) : '',
      });
    } else {
      setEditingOffer(null);
      setFormData({
        merchant_id: '',
        title: '',
        description: '',
        cashback_rate: '',
        terms: '',
        affiliate_link: '',
        is_active: true,
        end_date: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOffer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        merchant_id: parseInt(formData.merchant_id),
        cashback_rate: parseFloat(formData.cashback_rate),
      };
      if (editingOffer) {
        await apiClient.put(`/admin/offers/${editingOffer.id}`, payload);
      } else {
        await apiClient.post('/admin/offers', payload);
      }
      fetchData();
      handleCloseModal();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving offer');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    try {
      await apiClient.delete(`/admin/offers/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting offer');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Offers</h1>
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
          >
            + Add Offer
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashback</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {offers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {offer.merchant_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{offer.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-600">
                      {offer.cashback_rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          offer.is_active === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {offer.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleOpenModal(offer)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(offer.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
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
                {editingOffer ? 'Edit Offer' : 'Add Offer'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Merchant *</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.merchant_id}
                      onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                    >
                      <option value="">Select merchant</option>
                      {merchants.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title *</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700">Cashback Rate (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.cashback_rate}
                      onChange={(e) => setFormData({ ...formData, cashback_rate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Affiliate Link *</label>
                    <input
                      type="url"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.affiliate_link}
                      onChange={(e) => setFormData({ ...formData, affiliate_link: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Terms</label>
                    <textarea
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End date (optional)</label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                <div className="mt-6 flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    {editingOffer ? 'Update' : 'Create'}
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

export default AdminOffers;
