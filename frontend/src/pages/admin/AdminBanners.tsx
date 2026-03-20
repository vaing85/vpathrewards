import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface Merchant { id: number; name: string; }
interface Banner {
  id: number;
  merchant_id: number;
  image_url: string;
  click_url: string;
  width: number;
  height: number;
  alt_text?: string;
  is_active: number;
  created_at: string;
}

const emptyForm = { image_url: '', click_url: '', width: '', height: '', alt_text: '' };

const AdminBanners = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiClient.get('/admin/merchants').then(r => {
      const data = r.data?.data || r.data || [];
      setMerchants(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMerchant) { setBanners([]); return; }
    setLoading(true);
    apiClient.get('/admin/banners', { params: { merchant_id: selectedMerchant } })
      .then(r => setBanners(r.data))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, [selectedMerchant]);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    type === 'success' ? setSuccess(msg) : setError(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.post('/admin/banners', {
        merchant_id: Number(selectedMerchant),
        image_url: form.image_url,
        click_url: form.click_url,
        width: Number(form.width),
        height: Number(form.height),
        alt_text: form.alt_text || undefined,
      });
      setBanners(prev => [res.data, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      flash('Banner added successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add banner.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const res = await apiClient.patch(`/admin/banners/${banner.id}`, { is_active: !banner.is_active });
      setBanners(prev => prev.map(b => b.id === banner.id ? res.data : b));
    } catch {
      flash('Failed to update banner.', 'error');
    }
  };

  const deleteBanner = async (id: number) => {
    if (!confirm('Delete this banner permanently?')) return;
    try {
      await apiClient.delete(`/admin/banners/${id}`);
      setBanners(prev => prev.filter(b => b.id !== id));
      flash('Banner deleted.');
    } catch {
      flash('Failed to delete banner.', 'error');
    }
  };

  const activeBanners   = banners.filter(b => b.is_active === 1);
  const inactiveBanners = banners.filter(b => b.is_active === 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Banner Management</h1>
        {selectedMerchant && (
          <button
            onClick={() => { setShowForm(true); setForm(emptyForm); setError(''); }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            + Add Banner
          </button>
        )}
      </div>

      {/* Notifications */}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}
      {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* Merchant selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Merchant</label>
        <select
          value={selectedMerchant}
          onChange={e => setSelectedMerchant(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">— choose a merchant —</option>
          {merchants.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Add Banner Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-primary-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Banner</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
                <input
                  type="url"
                  required
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Click URL (affiliate link) *</label>
                <input
                  type="url"
                  required
                  value={form.click_url}
                  onChange={e => setForm({ ...form, click_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width (px) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.width}
                  onChange={e => setForm({ ...form, width: e.target.value })}
                  placeholder="e.g. 728"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (px) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.height}
                  onChange={e => setForm({ ...form, height: e.target.value })}
                  placeholder="e.g. 90"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text (optional)</label>
                <input
                  type="text"
                  value={form.alt_text}
                  onChange={e => setForm({ ...form, alt_text: e.target.value })}
                  placeholder="Descriptive text for the banner"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            {/* Live preview */}
            {form.image_url && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Preview:</p>
                <img
                  src={form.image_url}
                  alt="preview"
                  style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 6 }}
                />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition"
              >
                {saving ? 'Adding...' : 'Add Banner'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banner list */}
      {selectedMerchant && (
        loading ? (
          <div className="text-center py-12 text-gray-400">Loading banners...</div>
        ) : banners.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No banners yet for this merchant. Click "Add Banner" to get started.
          </div>
        ) : (
          <>
            {[{ label: 'Active', items: activeBanners }, { label: 'Inactive', items: inactiveBanners }]
              .filter(group => group.items.length > 0)
              .map(group => (
                <div key={group.label} className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3">
                    {group.label}
                    <span className="ml-2 text-sm font-normal text-gray-400">({group.items.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {group.items.map(banner => (
                      <div key={banner.id} className="bg-white rounded-lg shadow p-4 flex flex-col gap-3">
                        {/* Preview */}
                        <div className="bg-gray-50 rounded flex items-center justify-center p-2 min-h-[80px]">
                          <img
                            src={banner.image_url}
                            alt={banner.alt_text || 'Banner'}
                            style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        {/* Info */}
                        <div className="text-xs text-gray-500 space-y-1">
                          <div><span className="font-medium text-gray-700">Size:</span> {banner.width}×{banner.height}px</div>
                          {banner.alt_text && <div><span className="font-medium text-gray-700">Alt:</span> {banner.alt_text}</div>}
                          <div className="truncate"><span className="font-medium text-gray-700">Image:</span> {banner.image_url}</div>
                          <div className="truncate"><span className="font-medium text-gray-700">Link:</span> {banner.click_url}</div>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => toggleActive(banner)}
                            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition ${
                              banner.is_active
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {banner.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteBanner(banner.id)}
                            className="flex-1 text-xs font-medium py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </>
        )
      )}

      {!selectedMerchant && merchants.length > 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          Select a merchant above to manage their banners.
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
