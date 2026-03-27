import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import ReferralCode from '../components/ReferralCode';
import { useFormValidation } from '../hooks/useFormValidation';
import FormField from '../components/FormField';

interface ProfileData {
  id: number;
  email: string;
  name: string;
  total_earnings: number;
  created_at: string;
  notification_email: number;
  notification_cashback: number;
  notification_withdrawal: number;
  notification_new_offers: number;
}

const Profile = () => {
  const { isAuthenticated, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'subscription'>('profile');

  // Subscription state
  interface PlanInfo {
    key: string;
    name: string;
    amountCents: number;
    cashbackBonus: number;
    description: string;
    features: string[];
  }

  const [subscription, setSubscription] = useState<{
    plan: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cashback_bonus: number;
    plans: PlanInfo[];
  } | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subActionLoading, setSubActionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Profile validation
  const profileValidation = useFormValidation({
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, email: true },
  });

  // Password validation
  const passwordValidation = useFormValidation({
    current_password: { required: true },
    new_password: { required: true, minLength: 6 },
    confirm_password: {
      required: true,
      custom: (value) => {
        if (value !== passwordForm.new_password) {
          return 'Passwords do not match';
        }
        return null;
      }
    },
  });

  // Notifications form
  const [notificationsForm, setNotificationsForm] = useState({
    notification_email: true,
    notification_cashback: true,
    notification_withdrawal: true,
    notification_new_offers: false
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchSubscription();
  }, [isAuthenticated, navigate]);

  const fetchSubscription = async () => {
    setSubLoading(true);
    try {
      const res = await apiClient.get('/subscriptions/status');
      setSubscription(res.data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setSubLoading(false);
    }
  };

  const handleUpgrade = async (plan: string = 'gold') => {
    setSubActionLoading(true);
    try {
      const res = await apiClient.post('/subscriptions/checkout', { plan });
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start checkout');
      setSubActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setSubActionLoading(true);
    try {
      const res = await apiClient.post('/subscriptions/portal');
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to open billing portal');
      setSubActionLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/profile');
      setProfile(response.data);
      setProfileForm({
        name: response.data.name,
        email: response.data.email
      });
      setNotificationsForm({
        notification_email: response.data.notification_email === 1,
        notification_cashback: response.data.notification_cashback === 1,
        notification_withdrawal: response.data.notification_withdrawal === 1,
        notification_new_offers: response.data.notification_new_offers === 1
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate form
    const isValid = profileValidation.validateForm(profileForm);
    if (!isValid) {
      profileValidation.handleBlur('name');
      profileValidation.handleBlur('email');
      return;
    }

    setSaving(true);

    try {
      const response = await apiClient.put('/profile', profileForm);
      setProfile(response.data);
      // Update auth context
      updateUser({
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        total_earnings: response.data.total_earnings
      });
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate form
    const isValid = passwordValidation.validateForm(passwordForm);
    if (!isValid) {
      passwordValidation.handleBlur('current_password');
      passwordValidation.handleBlur('new_password');
      passwordValidation.handleBlur('confirm_password');
      return;
    }

    setSaving(true);

    try {
      await apiClient.put('/profile/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setSuccess('Password changed successfully!');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNotifications = async (updatedForm?: typeof notificationsForm) => {
    const formToSave = updatedForm || notificationsForm;
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await apiClient.put('/profile/notifications', formToSave);
      setSuccess('Notification preferences updated!');
      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update notifications');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await apiClient.delete('/profile', { data: { password: deletePassword } });
      await logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Account Settings</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'password'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Password
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'notifications'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Notifications
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className={`px-6 py-3 text-sm font-medium flex items-center gap-1 ${
                  activeTab === 'subscription'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Subscription
                {subscription?.plan === 'premium' && (
                  <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
                    PRO
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} noValidate>
                <div className="space-y-4">
                  <FormField
                    label="Name"
                    name="name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => {
                      setProfileForm({ ...profileForm, name: e.target.value });
                      profileValidation.handleChange('name', e.target.value);
                    }}
                    onBlur={() => profileValidation.handleBlur('name')}
                    error={profileValidation.getFieldError('name')}
                    touched={profileValidation.isFieldTouched('name')}
                    required
                    showSuccess
                  />
                  <FormField
                    label="Email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => {
                      setProfileForm({ ...profileForm, email: e.target.value });
                      profileValidation.handleChange('email', e.target.value);
                    }}
                    onBlur={() => profileValidation.handleBlur('email')}
                    error={profileValidation.getFieldError('email')}
                    touched={profileValidation.isFieldTouched('email')}
                    required
                    showSuccess
                    autoComplete="email"
                  />
                  {profile && (
                    <div className="text-sm text-gray-500">
                      <div>Member since: {new Date(profile.created_at).toLocaleDateString()}</div>
                      <div>Total earnings: ${profile.total_earnings.toFixed(2)}</div>
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handleChangePassword} noValidate>
                <div className="space-y-4">
                  <FormField
                    label="Current Password"
                    name="current_password"
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, current_password: e.target.value });
                      passwordValidation.handleChange('current_password', e.target.value);
                    }}
                    onBlur={() => passwordValidation.handleBlur('current_password')}
                    error={passwordValidation.getFieldError('current_password')}
                    touched={passwordValidation.isFieldTouched('current_password')}
                    required
                    autoComplete="current-password"
                  />
                  <FormField
                    label="New Password"
                    name="new_password"
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, new_password: e.target.value });
                      passwordValidation.handleChange('new_password', e.target.value);
                      // Re-validate confirm password if it's been touched
                      if (passwordValidation.isFieldTouched('confirm_password')) {
                        passwordValidation.handleChange('confirm_password', passwordForm.confirm_password);
                      }
                    }}
                    onBlur={() => passwordValidation.handleBlur('new_password')}
                    error={passwordValidation.getFieldError('new_password')}
                    touched={passwordValidation.isFieldTouched('new_password')}
                    required
                    autoComplete="new-password"
                  />
                  <FormField
                    label="Confirm New Password"
                    name="confirm_password"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, confirm_password: e.target.value });
                      passwordValidation.handleChange('confirm_password', e.target.value);
                    }}
                    onBlur={() => passwordValidation.handleBlur('confirm_password')}
                    error={passwordValidation.getFieldError('confirm_password')}
                    touched={passwordValidation.isFieldTouched('confirm_password')}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                  >
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                      <p className="text-xs text-gray-500">Receive general email notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationsForm.notification_email}
                        onChange={(e) => {
                          const updatedForm = { ...notificationsForm, notification_email: e.target.checked };
                          setNotificationsForm(updatedForm);
                          handleUpdateNotifications(updatedForm);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cashback Notifications</label>
                      <p className="text-xs text-gray-500">Get notified when cashback is confirmed</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationsForm.notification_cashback}
                        onChange={(e) => {
                          const updatedForm = { ...notificationsForm, notification_cashback: e.target.checked };
                          setNotificationsForm(updatedForm);
                          handleUpdateNotifications(updatedForm);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Withdrawal Notifications</label>
                      <p className="text-xs text-gray-500">Get notified about withdrawal status updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationsForm.notification_withdrawal}
                        onChange={(e) => {
                          const updatedForm = { ...notificationsForm, notification_withdrawal: e.target.checked };
                          setNotificationsForm(updatedForm);
                          handleUpdateNotifications(updatedForm);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">New Offer Alerts</label>
                      <p className="text-xs text-gray-500">Get notified when new cashback offers are added</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationsForm.notification_new_offers}
                        onChange={(e) => {
                          const updatedForm = { ...notificationsForm, notification_new_offers: e.target.checked };
                          setNotificationsForm(updatedForm);
                          handleUpdateNotifications(updatedForm);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div>
                {subLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                  </div>
                ) : subscription ? (
                  <div className="space-y-6">

                    {/* Current plan summary */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <p className="text-sm text-gray-500">Current plan</p>
                        <p className="font-bold text-gray-800 capitalize">{subscription.plan}</p>
                        {subscription.current_period_start && (
                          <p className="text-xs text-gray-400">Member since {new Date(subscription.current_period_start).toLocaleDateString()}</p>
                        )}
                        {subscription.current_period_end && (
                          <p className="text-xs text-gray-400">Renews {new Date(subscription.current_period_end).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-semibold ${
                          subscription.status === 'active' ? 'text-green-600' :
                          subscription.status === 'past_due' ? 'text-red-500' : 'text-gray-500'
                        }`}>{subscription.status}</span>
                        {subscription.cashback_bonus > 0 && (
                          <p className="text-xs text-green-600 font-medium">+{subscription.cashback_bonus}% cashback bonus</p>
                        )}
                      </div>
                    </div>

                    {/* 4-tier pricing cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {subscription.plans.map((p) => {
                        const isCurrent = subscription.plan === p.key;
                        const isPaid = p.amountCents > 0;
                        const planPriority: Record<string, number> = { free: 0, silver: 1, gold: 2, platinum: 3 };
                        const currentPriority = planPriority[subscription.plan] ?? 0;
                        const targetPriority = planPriority[p.key] ?? 0;
                        const changeLabel = currentPriority === 0
                          ? `Upgrade to ${p.name}`
                          : targetPriority > currentPriority
                            ? `Upgrade to ${p.name}`
                            : `Downgrade to ${p.name}`;
                        const tierColors: Record<string, string> = {
                          free:     'border-gray-200',
                          silver:   'border-gray-400',
                          gold:     'border-yellow-400',
                          platinum: 'border-purple-500',
                        };
                        const badgeColors: Record<string, string> = {
                          free:     'bg-gray-100 text-gray-600',
                          silver:   'bg-gray-200 text-gray-700',
                          gold:     'bg-yellow-100 text-yellow-800',
                          platinum: 'bg-purple-100 text-purple-800',
                        };
                        return (
                          <div
                            key={p.key}
                            className={`rounded-xl border-2 p-4 flex flex-col ${tierColors[p.key] || 'border-gray-200'} ${isCurrent ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColors[p.key] || 'bg-gray-100 text-gray-600'}`}>
                                {p.name}
                              </span>
                              {isCurrent && (
                                <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">Current</span>
                              )}
                            </div>
                            <p className="text-2xl font-bold text-gray-800 mb-1">
                              {p.amountCents === 0 ? 'Free' : `$${(p.amountCents / 100).toFixed(2)}`}
                              {p.amountCents > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
                            </p>
                            <p className="text-xs text-green-600 font-medium mb-3">
                              {p.cashbackBonus > 0 ? `+${p.cashbackBonus}% cashback bonus` : 'Standard cashback'}
                            </p>
                            <ul className="space-y-1 mb-4 flex-1">
                              {p.features.map((f) => (
                                <li key={f} className="flex items-start gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs text-gray-600">{f}</span>
                                </li>
                              ))}
                            </ul>
                            {!isCurrent && isPaid && (
                              <button
                                onClick={() => handleUpgrade(p.key)}
                                disabled={subActionLoading}
                                className="w-full text-sm font-semibold py-2 px-4 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition-colors"
                              >
                                {subActionLoading ? '...' : changeLabel}
                              </button>
                            )}
                            {isCurrent && isPaid && (
                              <button
                                onClick={handleManageSubscription}
                                disabled={subActionLoading}
                                className="w-full text-sm font-semibold py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white transition-colors"
                              >
                                {subActionLoading ? '...' : 'Manage Billing'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Unable to load subscription info.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Referral Code Section */}
        <div className="mt-6">
          <ReferralCode />
        </div>

        {/* Danger Zone */}
        <div className="mt-6 bg-white rounded-lg shadow border border-red-100 p-6">
          <h2 className="text-base font-semibold text-red-600 mb-1">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <button
            onClick={() => { setShowDeleteModal(true); setDeletePassword(''); setDeleteError(''); }}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
          >
            Delete My Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Account</h3>
                <p className="text-sm text-gray-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              All your earnings, transaction history, and data will be permanently deleted. Enter your password to confirm.
            </p>

            {deleteError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Password</label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
