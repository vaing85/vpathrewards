import { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';

interface CommissionSettings {
  commission_type: 'percentage' | 'flat';
  platform_share: number;
  flat_amount: number;
}

const AdminSettings = () => {
  const { admin } = useAdmin();
  const [current, setCurrent]   = useState('');
  const [newPass, setNewPass]   = useState('');
  const [confirm, setConfirm]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');

  // Test email
  const [testTo, setTestTo]         = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  // Commission settings
  const [commission, setCommission] = useState<CommissionSettings>({
    commission_type: 'percentage',
    platform_share: 25,
    flat_amount: 0,
  });
  const [commSaving, setCommSaving] = useState(false);
  const [commSuccess, setCommSuccess] = useState('');
  const [commError, setCommError] = useState('');

  useEffect(() => {
    apiClient.get('/admin/commission')
      .then(res => setCommission(res.data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPass !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (newPass.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/admin/auth/change-password', {
        current_password: current,
        new_password: newPass,
      });
      setSuccess('Password updated successfully.');
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    setTestSending(true);
    try {
      const res = await apiClient.post('/admin/auth/test-email', { to: testTo });
      setTestResult({ ok: true, msg: res.data.message + (res.data.from ? ` (from: ${res.data.from})` : '') });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.response?.data?.error || 'Failed to send test email.' });
    } finally {
      setTestSending(false);
    }
  };

  const handleCommissionSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommError(''); setCommSuccess('');
    setCommSaving(true);
    try {
      const res = await apiClient.put('/admin/commission', commission);
      setCommission(res.data);
      setCommSuccess('Commission settings saved successfully.');
    } catch (err: any) {
      setCommError(err.response?.data?.error || 'Failed to save commission settings.');
    } finally {
      setCommSaving(false);
    }
  };

  // Derived preview values
  const previewGross = 10.00;
  const previewPlatform = commission.commission_type === 'flat'
    ? Math.min(commission.flat_amount, previewGross)
    : previewGross * (commission.platform_share / 100);
  const previewUser = previewGross - previewPlatform;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Settings</h1>

      {/* Account Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Account</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <div><span className="font-medium text-gray-700">Name:</span> {admin?.name}</div>
          <div><span className="font-medium text-gray-700">Email:</span> {admin?.email}</div>
          <div><span className="font-medium text-gray-700">Role:</span> Administrator</div>
        </div>
      </div>

      {/* Commission / Pay Scale */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Commission Split</h2>
        <p className="text-xs text-gray-500 mb-4">
          Set how each cashback transaction is divided between the platform (you) and the user.
        </p>

        {commSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
            {commSuccess}
          </div>
        )}
        {commError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {commError}
          </div>
        )}

        <form onSubmit={handleCommissionSave} className="space-y-4">
          {/* Commission Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Type</label>
            <select
              value={commission.commission_type}
              onChange={e => setCommission(prev => ({ ...prev, commission_type: e.target.value as 'percentage' | 'flat' }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="percentage">Percentage of gross cashback</option>
              <option value="flat">Flat rate per transaction</option>
            </select>
          </div>

          {/* Percentage input */}
          {commission.commission_type === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Platform Share (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                required
                value={commission.platform_share}
                onChange={e => setCommission(prev => ({ ...prev, platform_share: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                User receives {(100 - commission.platform_share).toFixed(1)}% of every cashback earned.
              </p>
            </div>
          )}

          {/* Flat rate input */}
          {commission.commission_type === 'flat' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Flat Commission ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={commission.flat_amount}
                onChange={e => setCommission(prev => ({ ...prev, flat_amount: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                You take ${commission.flat_amount.toFixed(2)} per transaction; the remainder goes to the user.
              </p>
            </div>
          )}

          {/* Live preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-gray-700 mb-2">Preview — on a $10.00 gross cashback:</p>
            <div className="flex justify-between text-gray-600 mb-1">
              <span>Platform (you)</span>
              <span className="font-semibold text-gray-800">${previewPlatform.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>User payout</span>
              <span className="font-semibold text-green-700">${previewUser.toFixed(2)}</span>
            </div>
            {/* visual bar */}
            <div className="mt-3 h-3 rounded-full bg-gray-200 overflow-hidden flex">
              <div
                className="bg-primary-500 h-full transition-all"
                style={{ width: `${Math.min(100, (previewPlatform / previewGross) * 100)}%` }}
              />
              <div className="bg-green-400 h-full flex-1" />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Platform {commission.commission_type === 'percentage' ? `${commission.platform_share}%` : `$${commission.flat_amount}`}</span>
              <span>User {commission.commission_type === 'percentage' ? `${(100 - commission.platform_share).toFixed(1)}%` : 'remainder'}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={commSaving}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {commSaving ? 'Saving...' : 'Save Commission Settings'}
          </button>
        </form>
      </div>

      {/* Test Email */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Test Email</h2>
        <p className="text-xs text-gray-500 mb-4">Send a test welcome email to verify Resend is configured correctly.</p>

        {testResult && (
          <div className={`mb-4 text-sm px-4 py-3 rounded-lg border ${testResult.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {testResult.msg}
          </div>
        )}

        <form onSubmit={handleTestEmail} className="flex gap-3">
          <input
            type="email"
            required
            value={testTo}
            onChange={e => setTestTo(e.target.value)}
            placeholder="Send test to..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={testSending}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {testSending ? 'Sending...' : 'Send Test'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Change Password</h2>

        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">{success}</div>}
        {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
