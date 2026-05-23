import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';
import Pagination from '../../components/Pagination';
import OfferImportModal from '../../components/admin/OfferImportModal';

interface Offer {
  id: number;
  merchant_id: number;
  title: string;
  description?: string;
  cashback_rate: number;
  cashback_fixed_usd?: number | null;
  terms?: string;
  affiliate_link: string;
  is_active: number;
  merchant_name?: string;
  // CJ context — populated when the offer's merchant is linked to a CJ
  // advertiser. Used to surface the gross rate CJ pays so admins can set a
  // fair user-facing cashback without tabbing to /admin/cj.
  merchant_cj_advertiser_id?: string | null;
  merchant_cj_max_commission_rate?: number | null;
  merchant_cj_max_fixed_usd?: number | null;
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
  const [showImport, setShowImport] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  // rate_type: 'percent' → use cashback_rate, 'fixed' → use cashback_fixed_usd.
  // Mixed (both set) is possible but rare; we don't expose it in the UI to
  // keep the editor simple. Toggle clears the other field on switch.
  const [formData, setFormData] = useState({
    merchant_id: '',
    title: '',
    description: '',
    rate_type: 'percent' as 'percent' | 'fixed',
    cashback_rate: '',
    cashback_fixed_usd: '',
    terms: '',
    affiliate_link: '',
    is_active: true,
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
      const isFixed = (offer.cashback_fixed_usd ?? 0) > 0;
      setEditingOffer(offer);
      setFormData({
        merchant_id: offer.merchant_id.toString(),
        title: offer.title,
        description: offer.description || '',
        rate_type: isFixed ? 'fixed' : 'percent',
        cashback_rate: offer.cashback_rate.toString(),
        cashback_fixed_usd: offer.cashback_fixed_usd != null ? offer.cashback_fixed_usd.toString() : '',
        terms: offer.terms || '',
        affiliate_link: offer.affiliate_link,
        is_active: offer.is_active === 1,
      });
    } else {
      setEditingOffer(null);
      setFormData({
        merchant_id: '',
        title: '',
        description: '',
        rate_type: 'percent',
        cashback_rate: '',
        cashback_fixed_usd: '',
        terms: '',
        affiliate_link: '',
        is_active: true,
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
      const isFixed = formData.rate_type === 'fixed';
      // Backend requires cashback_rate to be a number (column is NOT NULL).
      // For fixed-only offers we send rate = 0 + the flat amount.
      const payload: Record<string, unknown> = {
        merchant_id: parseInt(formData.merchant_id),
        title: formData.title,
        description: formData.description,
        terms: formData.terms,
        affiliate_link: formData.affiliate_link,
        is_active: formData.is_active,
        cashback_rate: isFixed ? 0 : parseFloat(formData.cashback_rate || '0'),
        cashback_fixed_usd: isFixed ? parseFloat(formData.cashback_fixed_usd || '0') : null,
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
          <div className="flex gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 px-4 py-2 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
            >
              + Add Offer
            </button>
          </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashback (user)</th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    title="Gross % CJ pays this merchant. Use to size the user cashback rate. Set via /admin/cj."
                  >
                    CJ gross
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {offers.map((offer) => {
                  const userFixed = offer.cashback_fixed_usd ?? null;
                  const userIsFixed = userFixed != null && userFixed > 0;
                  const userRate = offer.cashback_rate;

                  const cjPct = offer.merchant_cj_max_commission_rate;
                  const cjFixed = offer.merchant_cj_max_fixed_usd;
                  const cjLinked = offer.merchant_cj_advertiser_id != null;

                  // Overpaying check: same rate-type comparison only. We don't
                  // try to compare $ vs % since the AOV is unknown.
                  const overpaying =
                    (userIsFixed && cjFixed != null && (userFixed as number) > cjFixed) ||
                    (!userIsFixed && cjPct != null && userRate > cjPct);
                  const passThroughPct = !userIsFixed && cjPct != null && cjPct > 0
                    ? (userRate / cjPct) * 100
                    : userIsFixed && cjFixed != null && cjFixed > 0
                      ? ((userFixed as number) / cjFixed) * 100
                      : null;

                  return (
                  <tr key={offer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {offer.merchant_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{offer.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${overpaying ? 'text-red-600' : 'text-primary-600'}`}>
                        {userIsFixed
                          ? `$${Number.isInteger(userFixed) ? userFixed : (userFixed as number).toFixed(2)}`
                          : `${userRate}%`}
                      </span>
                      {overpaying && (
                        <span
                          className="ml-1 text-xs text-red-600"
                          title="User cashback exceeds what CJ pays — you'd lose money on every conversion."
                        >
                          ⚠
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!cjLinked ? (
                        <span className="text-xs text-gray-400">not linked</span>
                      ) : cjPct == null && cjFixed == null ? (
                        <span className="text-xs text-gray-400">unenriched</span>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-gray-700 tabular-nums">
                            {cjPct != null && `${cjPct}%`}
                            {cjPct != null && cjFixed != null && ' / '}
                            {cjFixed != null && `$${Number.isInteger(cjFixed) ? cjFixed : cjFixed.toFixed(2)}`}
                          </span>
                          {passThroughPct != null && (
                            <span className="text-xs text-gray-400 tabular-nums">
                              {passThroughPct.toFixed(0)}% to user
                            </span>
                          )}
                        </div>
                      )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cashback type *</label>
                    <div className="flex gap-4 mb-2">
                      <label className="inline-flex items-center text-sm">
                        <input
                          type="radio"
                          className="mr-1.5"
                          checked={formData.rate_type === 'percent'}
                          onChange={() => setFormData({ ...formData, rate_type: 'percent' })}
                        />
                        Percentage
                      </label>
                      <label className="inline-flex items-center text-sm">
                        <input
                          type="radio"
                          className="mr-1.5"
                          checked={formData.rate_type === 'fixed'}
                          onChange={() => setFormData({ ...formData, rate_type: 'fixed' })}
                        />
                        Flat amount (USD)
                      </label>
                    </div>
                    {formData.rate_type === 'percent' ? (
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          required
                          placeholder="e.g. 5"
                          className="block w-full rounded-md border-gray-300 shadow-sm pr-8"
                          value={formData.cashback_rate}
                          onChange={(e) => setFormData({ ...formData, cashback_rate: e.target.value })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="e.g. 10.00"
                          className="block w-full rounded-md border-gray-300 shadow-sm pl-7"
                          value={formData.cashback_fixed_usd}
                          onChange={(e) => setFormData({ ...formData, cashback_fixed_usd: e.target.value })}
                        />
                      </div>
                    )}
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

        {/* Import Modal */}
        {showImport && (
          <OfferImportModal
            onClose={() => setShowImport(false)}
            onDone={() => { setShowImport(false); fetchData(); }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminOffers;
