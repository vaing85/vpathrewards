import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';
import OfferImportModal from '../../components/admin/OfferImportModal';
import { effectiveFlatUsd, PLATFORM_FEE_USD } from '../../utils/cashback';

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

interface MerchantGroup {
  merchantId: number;
  merchantName: string;
  cjAdvertiserId: string | null;
  offers: Offer[];
  activeCount: number;
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
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
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
  }, [isAuthenticated, navigate]);

  const fetchData = async () => {
    try {
      // Fetch all offers in one shot (cap is 2000, see backend/src/routes/admin/offers.ts).
      // The page groups them by merchant client-side so pagination at the offer
      // level isn't meaningful anymore — merchants are the unit of navigation.
      const [offersRes, merchantsRes] = await Promise.all([
        apiClient.get('/admin/offers', { params: { limit: 2000 } }),
        apiClient.get('/admin/merchants', { params: { limit: 1000 } }),
      ]);

      if (offersRes.data?.data) {
        setOffers(offersRes.data.data);
      } else {
        setOffers(offersRes.data || []);
      }

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

  // Group offers by merchant. Merchants ordered alphabetically; offers within
  // each group keep the backend's created_at DESC ordering (newest first).
  const groups: MerchantGroup[] = useMemo(() => {
    const byMerchant = new Map<number, MerchantGroup>();
    for (const offer of offers) {
      let g = byMerchant.get(offer.merchant_id);
      if (!g) {
        g = {
          merchantId: offer.merchant_id,
          merchantName: offer.merchant_name || `Merchant #${offer.merchant_id}`,
          cjAdvertiserId: offer.merchant_cj_advertiser_id ?? null,
          offers: [],
          activeCount: 0,
        };
        byMerchant.set(offer.merchant_id, g);
      }
      g.offers.push(offer);
      if (offer.is_active === 1) g.activeCount += 1;
    }
    return Array.from(byMerchant.values()).sort((a, b) =>
      a.merchantName.localeCompare(b.merchantName)
    );
  }, [offers]);

  const toggleExpanded = (merchantId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(merchantId)) {
        next.delete(merchantId);
      } else {
        next.add(merchantId);
      }
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(groups.map((g) => g.merchantId)));
  const collapseAll = () => setExpanded(new Set());

  const handleOpenModal = (offer?: Offer, merchantId?: number) => {
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
        merchant_id: merchantId ? merchantId.toString() : '',
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
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No offers yet. Click + Add Offer or Import CSV to create some.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Expand/collapse all */}
            <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {groups.length} merchant{groups.length === 1 ? '' : 's'} · {offers.length} offer{offers.length === 1 ? '' : 's'}
              </span>
              <div className="space-x-3">
                <button onClick={expandAll} className="text-primary-600 hover:text-primary-800">
                  Expand all
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={collapseAll} className="text-primary-600 hover:text-primary-800">
                  Collapse all
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-2 py-3"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Offers</th>
                    <th className="w-32"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groups.map((g) => {
                    const isOpen = expanded.has(g.merchantId);
                    const inactiveCount = g.offers.length - g.activeCount;
                    return (
                      <Fragment key={g.merchantId}>
                        <tr
                          onClick={() => toggleExpanded(g.merchantId)}
                          className="cursor-pointer hover:bg-gray-50"
                        >
                          <td className="px-2 py-3 text-center text-gray-400">
                            <span
                              className="inline-block transition-transform"
                              style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                              ▶
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{g.merchantName}</span>
                              {g.cjAdvertiserId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/admin/cj');
                                  }}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200"
                                  title={`Linked to CJ advertiser ${g.cjAdvertiserId} — click to manage`}
                                >
                                  CJ
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700 tabular-nums">
                            {g.activeCount}
                            {inactiveCount > 0 && (
                              <span className="text-gray-400"> / {g.offers.length}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal(undefined, g.merchantId);
                              }}
                              className="text-xs text-primary-600 hover:text-primary-800"
                              title={`Add a new offer for ${g.merchantName}`}
                            >
                              + Add
                            </button>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="bg-gray-50">
                            <td colSpan={4} className="px-6 py-4">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 uppercase">
                                    <th className="px-3 py-2 text-left font-medium">Title</th>
                                    <th
                                      className="px-3 py-2 text-left font-medium"
                                      title="What the user actually receives per conversion. Flat-rate: gross bounty − $5 platform fee (or full gross if ≤ $5). Percentage: gross %, ceiling — actual depends on tier share."
                                    >
                                      User cashback
                                    </th>
                                    <th
                                      className="px-3 py-2 text-left font-medium"
                                      title="Gross % CJ pays this merchant per its programTerms. Set via /admin/cj."
                                    >
                                      CJ gross
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium">Status</th>
                                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {g.offers.map((offer) => {
                                    const userFixed = offer.cashback_fixed_usd ?? null;
                                    const userIsFixed = userFixed != null && userFixed > 0;
                                    const userRate = offer.cashback_rate;
                                    const cjPct = offer.merchant_cj_max_commission_rate;
                                    const cjFixed = offer.merchant_cj_max_fixed_usd;
                                    const cjLinked = offer.merchant_cj_advertiser_id != null;
                                    // For flat-rate offers the user receives gross − $5 fee (or the
                                    // full gross if it's ≤ $5). Display & pass-through are computed
                                    // against this net amount so admins see what users actually get.
                                    const userNetFixed = userIsFixed ? effectiveFlatUsd(userFixed as number) : null;

                                    const overpaying =
                                      (userIsFixed && cjFixed != null && (userFixed as number) > cjFixed) ||
                                      (!userIsFixed && cjPct != null && userRate > cjPct);
                                    const passThroughPct = !userIsFixed && cjPct != null && cjPct > 0
                                      ? (userRate / cjPct) * 100
                                      : userIsFixed && cjFixed != null && cjFixed > 0
                                        ? ((userNetFixed as number) / cjFixed) * 100
                                        : null;

                                    return (
                                      <tr key={offer.id} className="bg-white">
                                        <td className="px-3 py-2 text-gray-700">{offer.title}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span
                                            className={`font-semibold ${overpaying ? 'text-red-600' : 'text-primary-600'}`}
                                            title={
                                              userIsFixed
                                                ? `User receives $${userNetFixed} per conversion (gross $${userFixed} − $${PLATFORM_FEE_USD} platform fee)`
                                                : undefined
                                            }
                                          >
                                            {userIsFixed
                                              ? `$${Number.isInteger(userNetFixed) ? userNetFixed : (userNetFixed as number).toFixed(2)}`
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
                                        <td className="px-3 py-2 whitespace-nowrap">
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
                                                <span
                                                  className="text-xs text-gray-400 tabular-nums"
                                                  title="Ratio of our stored commission to CJ's published gross rate."
                                                >
                                                  {passThroughPct.toFixed(0)}% of CJ
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span
                                            className={`px-2 py-0.5 text-xs rounded-full ${
                                              offer.is_active === 1
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}
                                          >
                                            {offer.is_active === 1 ? 'Active' : 'Inactive'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap space-x-3">
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
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
