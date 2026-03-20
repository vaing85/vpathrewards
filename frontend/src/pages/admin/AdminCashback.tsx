import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface Transaction {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  offer_title: string;
  merchant_name: string;
  merchant_logo?: string;
  amount: number;
  cashback_rate: number;
  status: 'pending' | 'confirmed' | 'rejected';
  transaction_date: string;
  notes?: string;
}

interface Merchant { id: number; name: string; }

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
};

const emptyCredit = { user_email: '', merchant_id: '', amount: '', notes: '' };

const AdminCashback = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchants, setMerchants]       = useState<Merchant[]>([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [credit, setCredit]             = useState(emptyCredit);
  const [crediting, setCrediting]       = useState(false);
  const [actioningId, setActioningId]   = useState<number | null>(null);
  const [success, setSuccess]           = useState('');
  const [error, setError]               = useState('');

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    type === 'success' ? setSuccess(msg) : setError(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const fetchTransactions = (status?: string) => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (status) params.status = status;
    apiClient.get('/admin/cashback', { params })
      .then(r => setTransactions(r.data))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions(statusFilter || undefined);
  }, [statusFilter]);

  useEffect(() => {
    apiClient.get('/admin/merchants')
      .then(r => setMerchants(r.data?.data || r.data || []))
      .catch(() => {});
  }, []);

  const confirm = async (id: number) => {
    setActioningId(id);
    try {
      const res = await apiClient.put(`/admin/cashback/${id}/confirm`);
      setTransactions(prev => prev.map(t => t.id === id ? res.data : t));
      flash('Transaction confirmed and user balance updated.');
    } catch (err: any) {
      flash(err.response?.data?.error || 'Failed to confirm.', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const reject = async (id: number) => {
    if (!confirm(`Reject transaction #${id}?`)) return;
    setActioningId(id);
    try {
      const res = await apiClient.put(`/admin/cashback/${id}/reject`);
      setTransactions(prev => prev.map(t => t.id === id ? res.data : t));
      flash('Transaction rejected.');
    } catch (err: any) {
      flash(err.response?.data?.error || 'Failed to reject.', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrediting(true);
    setError('');
    try {
      const res = await apiClient.post('/admin/cashback/credit', {
        user_email:  credit.user_email,
        merchant_id: Number(credit.merchant_id),
        amount:      parseFloat(credit.amount),
        notes:       credit.notes || undefined,
      });
      setTransactions(prev => [res.data, ...prev]);
      setCredit(emptyCredit);
      setShowCreditForm(false);
      flash(`$${parseFloat(credit.amount).toFixed(2)} credited to ${credit.user_email}.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to credit cashback.');
    } finally {
      setCrediting(false);
    }
  };

  const filtered = statusFilter
    ? transactions.filter(t => t.status === statusFilter)
    : transactions;

  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Cashback Management</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-yellow-600 mt-1">{pendingCount} pending transaction{pendingCount !== 1 ? 's' : ''} need review</p>
          )}
        </div>
        <button
          onClick={() => { setShowCreditForm(true); setCredit(emptyCredit); setError(''); }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + Manual Credit
        </button>
      </div>

      {/* Notifications */}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}
      {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* Manual Credit Form */}
      {showCreditForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-primary-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Manually Credit Cashback</h2>
          <form onSubmit={handleCredit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">User Email *</label>
                <input
                  type="email"
                  required
                  value={credit.user_email}
                  onChange={e => setCredit({ ...credit, user_email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant *</label>
                <select
                  required
                  value={credit.merchant_id}
                  onChange={e => setCredit({ ...credit, merchant_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— select merchant —</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={credit.amount}
                  onChange={e => setCredit({ ...credit, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={credit.notes}
                  onChange={e => setCredit({ ...credit, notes: e.target.value })}
                  placeholder="e.g. Compensation for tracking issue"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={crediting}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition"
              >
                {crediting ? 'Crediting...' : 'Credit Cashback'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreditForm(false); setError(''); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Filter by status:</span>
        {['', 'pending', 'confirmed', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading transactions...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          No transactions found.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant / Offer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">#{t.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{t.user_name}</div>
                      <div className="text-xs text-gray-500">{t.user_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{t.merchant_name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{t.offer_title}</div>
                      {t.notes && <div className="text-xs text-blue-500 italic mt-0.5">{t.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">${parseFloat(String(t.amount)).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {t.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirm(t.id)}
                            disabled={actioningId === t.id}
                            className="text-xs px-3 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 font-medium disabled:opacity-50 transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => reject(t.id)}
                            disabled={actioningId === t.id}
                            className="text-xs px-3 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 font-medium disabled:opacity-50 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {t.status !== 'pending' && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCashback;
