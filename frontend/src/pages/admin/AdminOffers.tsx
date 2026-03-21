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
  commission_rate: number;
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

interface CsvRow {
  title: string;
  description: string;
  affiliate_link: string;
  selected: boolean;
}

// Parse a CJ CSV line respecting quoted fields
const parseCsvLine = (line: string): string[] => {
  const cols: string[] = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
    else cur += ch;
  }
  cols.push(cur);
  return cols.map(c => c.replace(/^"|"$/g, '').trim());
};

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

  // CSV import state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvMerchantId, setCsvMerchantId] = useState('');
  const [csvCashback, setCsvCashback] = useState('');
  const [csvCommission, setCsvCommission] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [formData, setFormData] = useState({
    merchant_id: '',
    title: '',
    description: '',
    cashback_rate: '',
    commission_rate: '',
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
        commission_rate: offer.commission_rate?.toString() || '',
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
        commission_rate: '',
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
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : 0,
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

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const header = parseCsvLine(lines[0]);
      const nameIdx = header.findIndex(h => h === 'NAME');
      const descIdx = header.findIndex(h => h === 'DESCRIPTION');
      const urlIdx  = header.findIndex(h => h === 'CLICK URL');
      const langIdx = header.findIndex(h => h === 'LANGUAGE');

      // If it's a CJ CSV, filter English and map columns
      if (nameIdx !== -1 && urlIdx !== -1) {
        const rows: CsvRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (langIdx !== -1 && cols[langIdx] !== 'English') continue;
          const title = cols[nameIdx] || '';
          const desc  = descIdx !== -1 ? cols[descIdx] : '';
          const url   = cols[urlIdx] || '';
          if (!title || !url) continue;
          rows.push({ title, description: desc, affiliate_link: url, selected: true });
        }
        setCsvRows(rows);
      } else {
        // Simple CSV: title, description, affiliate_link
        const rows: CsvRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (!cols[0] || !cols[2]) continue;
          rows.push({ title: cols[0], description: cols[1] || '', affiliate_link: cols[2], selected: true });
        }
        setCsvRows(rows);
      }
      setCsvResult(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvImport = async () => {
    const selected = csvRows.filter(r => r.selected);
    if (!csvMerchantId || !csvCashback || selected.length === 0) return;
    setCsvImporting(true);
    try {
      const payload = selected.map(r => ({
        merchant_id: parseInt(csvMerchantId),
        title: r.title,
        description: r.description,
        affiliate_link: r.affiliate_link,
        cashback_rate: parseFloat(csvCashback),
        commission_rate: csvCommission ? parseFloat(csvCommission) : 0,
      }));
      const res = await apiClient.post('/admin/offers/bulk', { offers: payload });
      setCsvResult(res.data);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Import failed');
    } finally {
      setCsvImporting(false);
    }
  };

  const toggleAll = (checked: boolean) =>
    setCsvRows(rows => rows.map(r => ({ ...r, selected: checked })));

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Offers</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCsvModal(true); setCsvRows([]); setCsvResult(null); setCsvMerchantId(''); setCsvCashback(''); setCsvCommission(''); }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              ↑ Import CSV
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Cashback</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Your Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {offer.commission_rate ? `${offer.commission_rate}%` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {offer.commission_rate && offer.cashback_rate
                        ? `${(offer.commission_rate - offer.cashback_rate).toFixed(1)}%`
                        : '—'}
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

        {/* CSV Import Modal */}
        {showCsvModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-8 mx-auto p-6 border max-w-4xl shadow-lg rounded-lg bg-white mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Import Offers from CSV</h3>
                <button onClick={() => setShowCsvModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
              </div>

              {/* Step 1 — Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Merchant *</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={csvMerchantId}
                    onChange={e => setCsvMerchantId(e.target.value)}
                  >
                    <option value="">Select merchant</option>
                    {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">User Cashback % *</label>
                  <input type="number" step="0.1" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={csvCashback} onChange={e => setCsvCashback(e.target.value)} placeholder="e.g. 2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CJ Commission %</label>
                  <input type="number" step="0.1" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={csvCommission} onChange={e => setCsvCommission(e.target.value)} placeholder="e.g. 4" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Upload CSV File</label>
                  <input type="file" accept=".csv" onChange={handleCsvFile} className="w-full text-sm text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                </div>
              </div>

              {csvCashback && csvCommission && parseFloat(csvCommission) > 0 && (
                <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-md mb-3 inline-block">
                  Your margin: {(parseFloat(csvCommission) - parseFloat(csvCashback)).toFixed(1)}% per transaction
                </div>
              )}

              {/* Step 2 — Preview */}
              {csvRows.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">{csvRows.filter(r => r.selected).length} of {csvRows.length} offers selected</p>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => toggleAll(true)} className="text-primary-600 hover:underline">Select all</button>
                      <span className="text-gray-400">|</span>
                      <button onClick={() => toggleAll(false)} className="text-gray-500 hover:underline">Deselect all</button>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 max-h-80 overflow-y-auto">
                    <table className="min-w-full text-xs divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left w-8"></th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Title</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 w-64">Affiliate Link</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {csvRows.map((row, i) => (
                          <tr key={i} className={row.selected ? '' : 'opacity-40'}>
                            <td className="px-3 py-2">
                              <input type="checkbox" checked={row.selected} onChange={e => setCsvRows(rows => rows.map((r, j) => j === i ? { ...r, selected: e.target.checked } : r))} />
                            </td>
                            <td className="px-3 py-2 text-gray-800 max-w-xs truncate">{row.title}</td>
                            <td className="px-3 py-2 text-gray-400 truncate max-w-xs">{row.affiliate_link}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {csvResult && (
                    <div className="mb-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-lg">
                      ✓ Imported {csvResult.imported} offers — {csvResult.skipped} skipped (duplicates or invalid)
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleCsvImport}
                      disabled={csvImporting || !csvMerchantId || !csvCashback || csvRows.filter(r => r.selected).length === 0}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg"
                    >
                      {csvImporting ? 'Importing...' : `Import ${csvRows.filter(r => r.selected).length} Offers`}
                    </button>
                    <button onClick={() => setShowCsvModal(false)} className="border border-gray-300 text-gray-700 text-sm px-5 py-2 rounded-lg hover:bg-gray-50">
                      Close
                    </button>
                  </div>
                </>
              )}

              {csvRows.length === 0 && (
                <p className="text-sm text-gray-400 mt-2">Upload a CJ CSV file — English offers will be auto-filtered and previewed here.</p>
              )}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User Cashback (%) *</label>
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
                      <label className="block text-sm font-medium text-gray-700">CJ Commission (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={formData.commission_rate}
                        onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                        placeholder="e.g. 8"
                      />
                    </div>
                  </div>
                  {formData.cashback_rate && formData.commission_rate && (
                    <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-md">
                      Your margin: {(parseFloat(formData.commission_rate) - parseFloat(formData.cashback_rate)).toFixed(1)}% per transaction
                    </div>
                  )}
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
