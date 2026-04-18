import { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface Alert {
  id: number;
  merchant_id: number | null;
  offer_id: number | null;
  alert_type: string;
  threshold_rate: number | null;
  merchant_name: string | null;
  offer_title: string | null;
  current_rate: number | null;
  last_triggered_at: string | null;
  created_at: string;
}

interface Merchant { id: number; name: string; }

export default function CashbackAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/alerts').then(({ data }) => setAlerts(Array.isArray(data.alerts) ? data.alerts : [])).catch(() => {});
    apiClient.get('/merchants').then(({ data }) => setMerchants(Array.isArray(data.merchants) ? data.merchants : Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const create = async () => {
    if (!selectedMerchant) { setError('Select a merchant'); return; }
    setError(''); setSaving(true);
    try {
      const { data } = await apiClient.post('/alerts', {
        merchant_id: Number(selectedMerchant),
        threshold_rate: threshold ? Number(threshold) : null,
      });
      setAlerts((prev) => [data.alert, ...prev]);
      setSelectedMerchant(''); setThreshold('');
    } catch { setError('Failed to create alert'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await apiClient.delete(`/alerts/${id}`);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span>🔔</span> Cashback Rate Alerts
      </h2>

      {/* Create form */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <select
          value={selectedMerchant}
          onChange={(e) => setSelectedMerchant(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Select merchant…</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min rate % (optional)"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-44 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={create}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? 'Adding…' : 'Add Alert'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Alert list */}
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No alerts set up yet.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {alerts.map((a) => (
            <li key={a.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {a.merchant_name ?? a.offer_title ?? 'Unknown'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.threshold_rate != null
                    ? `Notify when rate > ${a.threshold_rate}%`
                    : 'Notify on any rate increase'}
                  {a.last_triggered_at && ` · Last fired ${new Date(a.last_triggered_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="text-xs text-red-400 hover:text-red-600 transition ml-4"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
