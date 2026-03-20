import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';

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
