import { useEffect, useRef, useState } from 'react';
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
  cashback_type?: string;
  commission_rate: number;
  terms?: string;
  affiliate_link: string;
  is_active: number;
  merchant_name?: string;
  end_date?: string;
  excluded_states?: string;
}

interface BrokenOffer {
  id: number;
  title: string;
  affiliate_link: string;
  link_status: string;
  link_last_checked: string;
  link_error: string;
  merchant_name: string;
}

interface Merchant {
  id: number;
  name: string;
}

interface CsvRow {
  title: string;
  description: string;
  affiliate_link: string;
  category: string;
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
  const [brokenOffers, setBrokenOffers] = useState<BrokenOffer[]>([]);
  const [showBrokenOnly, setShowBrokenOnly] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);

  // CSV import state
  const csvFileRef = useRef<HTMLInputElement>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvMerchantId, setCsvMerchantId] = useState('');
  const [csvDetectedMerchant, setCsvDetectedMerchant] = useState('');
  const [csvCashback, setCsvCashback] = useState('');
  const [csvCommission, setCsvCommission] = useState('');
  const [csvCashbackType, setCsvCashbackType] = useState<'percentage' | 'flat'>('percentage');
  const [csvNewMerchantMode, setCsvNewMerchantMode] = useState(false);
  const [csvNewMerchant, setCsvNewMerchant] = useState({ name: '', description: '', website: '', logo_url: '', category: '' });
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [formData, setFormData] = useState({
    merchant_id: '',
    title: '',
    description: '',
    cashback_rate: '',
    cashback_type: 'percentage',
    commission_rate: '',
    terms: '',
    affiliate_link: '',
    is_active: true,
    end_date: '',
    excluded_states: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate, currentPage]);

  const fetchBrokenOffers = async () => {
    try {
      const res = await apiClient.get('/admin/offers/link-status/broken');
      setBrokenOffers(res.data?.data || []);
    } catch {
      // silently ignore — link checker may not have run yet
    }
  };

  const handleRunLinkCheck = async () => {
    setRunningCheck(true);
    try {
      await apiClient.post('/admin/jobs/run', { jobName: 'link-checker' });
      await fetchBrokenOffers();
    } catch (err) {
      console.error('Link check failed:', err);
    } finally {
      setRunningCheck(false);
    }
  };

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
    fetchBrokenOffers();
  };

  const handleOpenModal = (offer?: Offer) => {
    if (offer) {
      setEditingOffer(offer);
      setFormData({
        merchant_id: offer.merchant_id.toString(),
        title: offer.title,
        description: offer.description || '',
        cashback_rate: offer.cashback_rate.toString(),
        cashback_type: offer.cashback_type || 'percentage',
        commission_rate: offer.commission_rate?.toString() || '',
        terms: offer.terms || '',
        affiliate_link: offer.affiliate_link,
        is_active: offer.is_active === 1,
        end_date: offer.end_date ? offer.end_date.slice(0, 10) : '',
        excluded_states: offer.excluded_states || '',
      });
    } else {
      setEditingOffer(null);
      setFormData({
        merchant_id: '',
        title: '',
        description: '',
        cashback_rate: '',
        cashback_type: 'percentage',
        commission_rate: '',
        terms: '',
        affiliate_link: '',
        is_active: true,
        end_date: '',
        excluded_states: '',
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
        excluded_states: formData.excluded_states.trim().toUpperCase() || null,
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
    setCsvRows([]); setCsvResult(null); setCsvMerchantId(''); setCsvDetectedMerchant('');
    setCsvCashback(''); setCsvCommission(''); setCsvCashbackType('percentage');
    setCsvNewMerchantMode(false); setCsvNewMerchant({ name: '', description: '', website: '', logo_url: '', category: '' });
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const header = parseCsvLine(lines[0]);
      const nameIdx    = header.findIndex(h => h === 'NAME');
      const descIdx    = header.findIndex(h => h === 'DESCRIPTION');
      const urlIdx     = header.findIndex(h => h === 'CLICK URL');
      const langIdx    = header.findIndex(h => h === 'LANGUAGE');
      const advIdx     = header.findIndex(h => h === 'ADVERTISER NAME' || h === 'ADVERTISER');
      const advUrlIdx  = header.findIndex(h => h === 'ADVERTISER URL' || h === 'ADVERTISER WEBSITE');
      const catIdx     = header.findIndex(h => h === 'CATEGORY' || h === 'CATEGORY NAME');

      // CJ CSV format: has NAME and CLICK URL columns
      if (nameIdx !== -1 && urlIdx !== -1) {
        const rows: CsvRow[] = [];
        let detectedAdvertiser = '';
        let detectedWebsite = '';
        let detectedCategory = '';
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (langIdx !== -1 && cols[langIdx] !== 'English') continue;
          const title    = cols[nameIdx] || '';
          const desc     = descIdx !== -1 ? cols[descIdx] : '';
          const url      = cols[urlIdx] || '';
          const category = catIdx !== -1 ? cols[catIdx] : '';
          const advName  = advIdx !== -1 ? cols[advIdx] : '';
          const advUrl   = advUrlIdx !== -1 ? cols[advUrlIdx] : '';
          if (!title || !url) continue;
          if (!detectedAdvertiser && advName) detectedAdvertiser = advName;
          if (!detectedWebsite && advUrl) detectedWebsite = advUrl;
          if (!detectedCategory && category) detectedCategory = category;
          rows.push({ title, description: desc, affiliate_link: url, category, selected: true });
        }
        setCsvRows(rows);
        if (detectedAdvertiser) {
          setCsvDetectedMerchant(detectedAdvertiser);
          const lower = detectedAdvertiser.toLowerCase();
          const match = merchants.find(m =>
            m.name.toLowerCase() === lower ||
            m.name.toLowerCase().includes(lower) ||
            lower.includes(m.name.toLowerCase())
          );
          if (match) {
            setCsvMerchantId(String(match.id));
          } else {
            // No existing merchant match — pre-fill new merchant form
            setCsvNewMerchantMode(true);
            setCsvNewMerchant({
              name: detectedAdvertiser,
              description: '',
              website: detectedWebsite,
              logo_url: '',
              category: detectedCategory,
            });
          }
        }
      } else {
        // Simple CSV: title, description, affiliate_link, category (optional 4th col)
        const rows: CsvRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (!cols[0] || !cols[2]) continue;
          rows.push({ title: cols[0], description: cols[1] || '', affiliate_link: cols[2], category: cols[3] || '', selected: true });
        }
        setCsvRows(rows);
      }
      setShowCsvModal(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvImport = async () => {
    const selected = csvRows.filter(r => r.selected);
    if (!csvCashback || selected.length === 0) return;
    if (!csvNewMerchantMode && !csvMerchantId) return;
    if (csvNewMerchantMode && !csvNewMerchant.name.trim()) return;
    setCsvImporting(true);
    try {
      let merchantId = parseInt(csvMerchantId);

      // Create merchant first if in new-merchant mode
      if (csvNewMerchantMode) {
        const mRes = await apiClient.post('/admin/merchants', {
          name: csvNewMerchant.name.trim(),
          description: csvNewMerchant.description.trim() || undefined,
          website_url: csvNewMerchant.website.trim() || undefined,
          logo_url: csvNewMerchant.logo_url.trim() || undefined,
          category: csvNewMerchant.category.trim() || undefined,
        });
        merchantId = mRes.data.id;
        await fetchData(); // refresh merchants list
      }

      const payload = selected.map(r => ({
        merchant_id: merchantId,
        title: r.title,
        description: r.description,
        affiliate_link: r.affiliate_link,
        cashback_rate: parseFloat(csvCashback),
        commission_rate: csvCommission ? parseFloat(csvCommission) : 0,
        cashback_type: csvCashbackType,
        category: r.category || null,
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
            <input ref={csvFileRef} type="file" accept=".csv" onChange={handleCsvFile} className="hidden" />
            <button
              onClick={handleRunLinkCheck}
              disabled={runningCheck}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {runningCheck ? 'Checking…' : '🔗 Check Links'}
            </button>
            <button
              onClick={() => csvFileRef.current?.click()}
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

        {/* Broken Links Banner */}
        {brokenOffers.length > 0 && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-red-600 text-xl">⚠</span>
                <div>
                  <p className="font-semibold text-red-800">
                    {brokenOffers.length} offer{brokenOffers.length !== 1 ? 's' : ''} with broken or expired links
                  </p>
                  <p className="text-sm text-red-600">Review and deactivate or update these offers.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBrokenOnly(v => !v)}
                  className="text-sm px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-100"
                >
                  {showBrokenOnly ? 'Hide details' : 'Show details'}
                </button>
                <button
                  onClick={handleRunLinkCheck}
                  disabled={runningCheck}
                  className="text-sm px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {runningCheck ? 'Checking…' : 'Run Check Now'}
                </button>
              </div>
            </div>

            {showBrokenOnly && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-red-200">
                  <thead>
                    <tr className="text-left text-xs font-medium text-red-700 uppercase">
                      <th className="pb-2 pr-4">ID</th>
                      <th className="pb-2 pr-4">Merchant</th>
                      <th className="pb-2 pr-4">Title</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Error / Reason</th>
                      <th className="pb-2 pr-4">Last Checked</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {brokenOffers.map(bo => (
                      <tr key={bo.id} className="align-top">
                        <td className="py-2 pr-4 text-gray-500">{bo.id}</td>
                        <td className="py-2 pr-4 font-medium text-gray-800">{bo.merchant_name || '—'}</td>
                        <td className="py-2 pr-4 text-gray-700 max-w-xs truncate" title={bo.title}>{bo.title}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            bo.link_status === 'expired'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {bo.link_status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-500 max-w-xs truncate" title={bo.link_error}>{bo.link_error || '—'}</td>
                        <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">
                          {bo.link_last_checked ? new Date(bo.link_last_checked).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 whitespace-nowrap space-x-2">
                          <button
                            onClick={() => handleOpenModal(offers.find(o => o.id === bo.id))}
                            className="text-primary-600 hover:text-primary-900 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await apiClient.put(`/admin/offers/${bo.id}`, { is_active: false });
                                fetchData();
                              } catch {}
                            }}
                            className="text-red-600 hover:text-red-900 text-xs"
                          >
                            Deactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-gray-900">Import Offers from CSV</h3>
                <button onClick={() => setShowCsvModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
              </div>

              {/* Step 1 — Merchant */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Merchant</h4>
                  <div className="flex gap-3 text-xs">
                    <button
                      onClick={() => setCsvNewMerchantMode(false)}
                      className={`px-3 py-1 rounded-full border ${!csvNewMerchantMode ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                      Use existing
                    </button>
                    <button
                      onClick={() => setCsvNewMerchantMode(true)}
                      className={`px-3 py-1 rounded-full border ${csvNewMerchantMode ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                      + Create new
                    </button>
                  </div>
                </div>

                {!csvNewMerchantMode ? (
                  <div>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={csvMerchantId}
                      onChange={e => setCsvMerchantId(e.target.value)}
                    >
                      <option value="">Select merchant</option>
                      {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {csvDetectedMerchant && (
                      <p className={`text-xs mt-1 ${csvMerchantId ? 'text-green-600' : 'text-amber-600'}`}>
                        {csvMerchantId ? `✓ Auto-matched: ${csvDetectedMerchant}` : `⚠ No match for "${csvDetectedMerchant}" — select above or create new`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-gray-500">A new merchant will be created and linked to these offers.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Merchant Name *</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={csvNewMerchant.name}
                          onChange={e => setCsvNewMerchant(m => ({ ...m, name: e.target.value }))}
                          placeholder="e.g. Amazon"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={csvNewMerchant.category}
                          onChange={e => setCsvNewMerchant(m => ({ ...m, category: e.target.value }))}
                          placeholder="e.g. Shopping"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Website URL</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={csvNewMerchant.website}
                          onChange={e => setCsvNewMerchant(m => ({ ...m, website: e.target.value }))}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Logo URL</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={csvNewMerchant.logo_url}
                          onChange={e => setCsvNewMerchant(m => ({ ...m, logo_url: e.target.value }))}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={csvNewMerchant.description}
                        onChange={e => setCsvNewMerchant(m => ({ ...m, description: e.target.value }))}
                        placeholder="Short description of this merchant"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2 — Commission Settings */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Commission Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cashback Type</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={csvCashbackType}
                      onChange={e => setCsvCashbackType(e.target.value as 'percentage' | 'flat')}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      User Cashback {csvCashbackType === 'percentage' ? '(%)' : '($)'} *
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={csvCashback}
                      onChange={e => setCsvCashback(e.target.value)}
                      placeholder={csvCashbackType === 'percentage' ? 'e.g. 5' : 'e.g. 3.00'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      CJ Commission {csvCashbackType === 'percentage' ? '(%)' : '($)'}
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={csvCommission}
                      onChange={e => setCsvCommission(e.target.value)}
                      placeholder={csvCashbackType === 'percentage' ? 'e.g. 10' : 'e.g. 10.00'}
                    />
                  </div>
                </div>
                {csvCashback && csvCommission && parseFloat(csvCommission) > 0 && csvCashbackType === 'percentage' && (
                  <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-md mt-2 inline-block">
                    Margin: {(parseFloat(csvCommission) - parseFloat(csvCashback)).toFixed(2)}% per transaction
                  </p>
                )}
              </div>

              {/* Step 3 — Preview */}
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
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 max-h-72 overflow-y-auto">
                    <table className="min-w-full text-xs divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left w-8"></th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Title</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Category</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 w-56">Affiliate Link</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {csvRows.map((row, i) => (
                          <tr key={i} className={row.selected ? '' : 'opacity-40'}>
                            <td className="px-3 py-2">
                              <input type="checkbox" checked={row.selected} onChange={e => setCsvRows(rows => rows.map((r, j) => j === i ? { ...r, selected: e.target.checked } : r))} />
                            </td>
                            <td className="px-3 py-2 text-gray-800 max-w-xs truncate">{row.title}</td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.category || <span className="text-gray-300">—</span>}</td>
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
                      disabled={
                        csvImporting || !csvCashback ||
                        (!csvNewMerchantMode && !csvMerchantId) ||
                        (csvNewMerchantMode && !csvNewMerchant.name.trim()) ||
                        csvRows.filter(r => r.selected).length === 0
                      }
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cashback Type *</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.cashback_type}
                      onChange={(e) => setFormData({ ...formData, cashback_type: e.target.value })}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat ($)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        User Cashback ({formData.cashback_type === 'flat' ? '$' : '%'}) *
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700">CJ Commission ($)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={formData.commission_rate}
                        onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                        placeholder="e.g. 20"
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
                    <label className="block text-sm font-medium text-gray-700">
                      Excluded States
                      <span className="ml-1 text-xs text-gray-400">(comma-separated, e.g. CA,IA,UT,WA)</span>
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      value={formData.excluded_states}
                      onChange={(e) => setFormData({ ...formData, excluded_states: e.target.value.toUpperCase() })}
                      placeholder="e.g. CA,IA,UT,WA"
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
