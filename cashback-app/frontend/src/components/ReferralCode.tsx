import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const ReferralCode = () => {
  const { isAuthenticated } = useAuth();
  const [referralData, setReferralData] = useState<{ referral_code: string; referral_link: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReferralCode();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchReferralCode = async () => {
    try {
      const response = await apiClient.get('/tracking/referral-code');
      setReferralData(response.data);
    } catch (error) {
      console.error('Error fetching referral code:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (!referralData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Referral Code</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={referralData.referral_code}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono"
            />
            <button
              onClick={() => copyToClipboard(referralData.referral_code)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Referral Link</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={referralData.referral_link}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            />
            <button
              onClick={() => copyToClipboard(referralData.referral_link)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Share your referral code with friends! When they sign up using your code, you both earn rewards.
        </p>
      </div>
    </div>
  );
};

export default ReferralCode;
