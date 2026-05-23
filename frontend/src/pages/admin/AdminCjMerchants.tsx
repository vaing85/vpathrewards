import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';

interface ActionBreakdown {
  action_name: string;
  max_percent: number | null;
  fixed_amounts: Array<{ currency: string | null; value: number }>;
}

interface CjMerchant {
  id: number;
  name: string;
  category: string | null;
  offer_count: number;
  cj_advertiser_id: string;
  cj_max_commission_rate: number | null;
  cj_synced_at: string | null;
  term_name: string | null;
  actions: ActionBreakdown[];
}

interface UnlinkedMerchant {
  id: number;
  name: string;
  category: string | null;
}

const fmtRel = (iso: string | null): string => {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const fmtPct = (n: number | null): string =>
  n == null ? '—' : Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;

const AdminCjMerchants = () => {
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<CjMerchant[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftAdvertiser, setDraftAdvertiser] = useState<string>('');
  const [linkingMerchantId, setLinkingMerchantId] = useState<string>('');
  const [linkingAdvertiserId, setLinkingAdvertiserId] = useState<string>('');
  const [linkingBusy, setLinkingBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    void load();
  }, [isAuthenticated, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const [linkedRes, unlinkedRes] = await Promise.all([
        apiClient.get<{ merchants: CjMerchant[] }>('/admin/cj/merchants'),
        apiClient.get<{ merchants: UnlinkedMerchant[] }>('/admin/cj/merchants/unlinked'),
      ]);
      setMerchants(linkedRes.data.merchants);
      setUnlinked(unlinkedRes.data.merchants);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.error || 'Failed to load CJ merchants');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (m: CjMerchant) => {
    setEditingId(m.id);
    setDraftAdvertiser(m.cj_advertiser_id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftAdvertiser('');
  };

  const saveEdit = async (id: number) => {
    try {
      await apiClient.put(`/admin/cj/merchants/${id}`, {
        cj_advertiser_id: draftAdvertiser.trim() || null,
      });
      cancelEdit();
      await load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to save');
    }
  };

  const unlink = async (id: number) => {
    if (!confirm('Unlink this merchant from CJ? This also clears its CJ rate + terms.')) return;
    try {
      await apiClient.put(`/admin/cj/merchants/${id}`, { cj_advertiser_id: null });
      await load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to unlink');
    }
  };

  const linkMerchant = async () => {
    const mid = parseInt(linkingMerchantId, 10);
    if (!Number.isFinite(mid)) {
      alert('Select a merchant');
      return;
    }
    if (!/^\d+$/.test(linkingAdvertiserId.trim())) {
      alert('Advertiser ID must be numeric');
      return;
    }
    setLinkingBusy(true);
    try {
      await apiClient.put(`/admin/cj/merchants/${mid}`, {
        cj_advertiser_id: linkingAdvertiserId.trim(),
      });
      setLinkingMerchantId('');
      setLinkingAdvertiserId('');
      await load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to link');
    } finally {
      setLinkingBusy(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading CJ merchants…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">CJ Merchants</h1>
            <p className="text-sm text-gray-500 mt-1">
              {merchants.length} merchant{merchants.length === 1 ? '' : 's'} linked to CJ.
              Rates below are the <strong>gross %</strong> CJ pays you — set user-facing
              cashback on each <Link to="/admin/offers" className="text-blue-600 hover:underline">offer</Link>.
            </p>
          </div>
          <button
            onClick={load}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* ─── Link a new merchant ────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Link a merchant to a CJ advertiser
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Merchant</label>
              <select
                value={linkingMerchantId}
                onChange={(e) => setLinkingMerchantId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Select a merchant…</option>
                {unlinked.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.category ? ` — ${m.category}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <label className="block text-xs text-gray-500 mb-1">CJ Advertiser ID</label>
              <input
                value={linkingAdvertiserId}
                onChange={(e) => setLinkingAdvertiserId(e.target.value)}
                placeholder="e.g. 1874913"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
              />
            </div>
            <button
              onClick={linkMerchant}
              disabled={linkingBusy || !linkingMerchantId || !linkingAdvertiserId}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {linkingBusy ? 'Linking…' : 'Link'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Find the advertiser ID in the CJ Member portal at members.cj.com. The next
            nightly sync will populate commission rates automatically.
          </p>
        </div>

        {/* ─── Linked merchants table ─────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Merchant</th>
                <th className="text-left px-4 py-3">CJ Advertiser ID</th>
                <th className="text-right px-4 py-3">Max CJ %</th>
                <th className="text-right px-4 py-3">Offers</th>
                <th className="text-left px-4 py-3">Last synced</th>
                <th className="text-right px-4 py-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {merchants.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    No CJ-linked merchants yet. Use the form above to link one.
                  </td>
                </tr>
              )}
              {merchants.map((m) => {
                const isExpanded = expanded.has(m.id);
                const isEditing = editingId === m.id;
                return (
                  <>
                    <tr key={`row-${m.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleExpand(m.id)}
                          className="text-left hover:text-blue-600 flex items-center gap-2"
                        >
                          <span className="text-gray-400">{isExpanded ? '▾' : '▸'}</span>
                          <div>
                            <div className="font-medium text-gray-800">{m.name}</div>
                            {m.category && (
                              <div className="text-xs text-gray-500">{m.category}</div>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {isEditing ? (
                          <input
                            value={draftAdvertiser}
                            onChange={(e) => setDraftAdvertiser(e.target.value)}
                            className="w-32 border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                            autoFocus
                          />
                        ) : (
                          m.cj_advertiser_id
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                        {fmtPct(m.cj_max_commission_rate)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                        {m.offer_count}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {fmtRel(m.cj_synced_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => saveEdit(m.id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => startEdit(m)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => unlink(m.id)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Unlink
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`details-${m.id}`} className="bg-gray-50">
                        <td colSpan={6} className="px-8 py-4">
                          {m.term_name && (
                            <div className="text-xs text-gray-600 mb-2">
                              <span className="font-semibold">Term:</span> {m.term_name}
                            </div>
                          )}
                          {m.actions.length === 0 ? (
                            <div className="text-xs text-gray-500">
                              No structured action data available.
                            </div>
                          ) : (
                            <table className="w-full text-xs">
                              <thead className="text-gray-500">
                                <tr>
                                  <th className="text-left py-1">Action</th>
                                  <th className="text-right py-1 w-32">Max %</th>
                                  <th className="text-right py-1">Flat amounts</th>
                                </tr>
                              </thead>
                              <tbody>
                                {m.actions.map((a, i) => (
                                  <tr key={i} className="border-t border-gray-200">
                                    <td className="py-1.5 text-gray-700">{a.action_name}</td>
                                    <td className="py-1.5 text-right font-medium tabular-nums">
                                      {fmtPct(a.max_percent)}
                                    </td>
                                    <td className="py-1.5 text-right text-gray-600">
                                      {a.fixed_amounts.length === 0
                                        ? '—'
                                        : a.fixed_amounts
                                            .map((f) =>
                                              `${f.currency ?? '$'}${f.value}`
                                            )
                                            .join(', ')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCjMerchants;
