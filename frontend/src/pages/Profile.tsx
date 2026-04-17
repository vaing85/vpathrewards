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
  const { isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'subscription'>('profile');
  const [subscription, setSubscription] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
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
    } catch (_) {}
    setSubLoading(false);
  };

  const handleManageBilling = async () => {
    try {
      const res = await apiClient.post('/subscriptions/portal');
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to open billing portal');
    }
  };

  const handleUpgrade = async (plan: string) => {
    try {
      const res = await apiClient.post('/subscriptions/checkout', { plan });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start checkout');
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
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'subscription'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Subscription
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
                  <div className="py-8 text-center text-gray-400">Loading subscription...</div>
                ) : (
                  <>
                    {/* Current plan banner */}
                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs text-primary-500 uppercase font-semibold tracking-wide mb-0.5">Current Plan</div>
                          <div className="text-xl font-bold text-primary-700 capitalize">
                            {subscription?.plan || 'Free'}
                          </div>
                          {subscription?.subscription_status === 'active' && (
                            <div className="text-xs text-primary-500 mt-0.5">
                              Renews {subscription?.current_period_end ? new Date(subscription.current_period_end * 1000).toLocaleDateString() : '—'}
                            </div>
                          )}
                        </div>
                        {subscription?.subscription_status === 'active' && (
                          <button
                            onClick={handleManageBilling}
                            className="text-sm bg-white border border-primary-300 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 transition"
                          >
                            Manage Billing
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Plan cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { key: 'bronze', name: 'Bronze', price: '$4.99/mo', bonus: '+1% cashback', color: 'amber' },
                        { key: 'silver', name: 'Silver', price: '$9.99/mo', bonus: '+2% cashback', color: 'gray' },
                        { key: 'gold',   name: 'Gold',   price: '$14.99/mo', bonus: '+3% cashback', color: 'yellow' },
                        { key: 'platinum', name: 'Platinum', price: '$19.99/mo', bonus: '+4% cashback', color: 'indigo' },
                      ].map(plan => {
                        const isCurrent = subscription?.plan === plan.key;
                        return (
                          <div
                            key={plan.key}
                            className={`border rounded-lg p-4 ${isCurrent ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-semibold text-gray-800">{plan.name}</div>
                                <div className="text-sm text-primary-600 font-medium">{plan.bonus}</div>
                              </div>
                              <div className="text-sm font-bold text-gray-700">{plan.price}</div>
                            </div>
                            {isCurrent ? (
                              <span className="inline-block text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">Current</span>
                            ) : (
                              <button
                                onClick={() => handleUpgrade(plan.key)}
                                className="mt-2 w-full text-sm bg-primary-600 hover:bg-primary-700 text-white py-1.5 rounded-lg transition"
                              >
                                Upgrade
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Referral Code Section */}
        <div className="mt-6">
          <ReferralCode />
        </div>
      </div>
    </div>
  );
};

export default Profile;
