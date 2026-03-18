import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SubscriptionSuccess = () => {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're now Premium!</h1>
        <p className="text-gray-500 mb-6">
          Your subscription is active. You're now earning <span className="font-semibold text-green-600">+1% bonus cashback</span> on every offer.
        </p>

        {/* Benefits */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-xl p-4 mb-8 text-left space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-1">Your Premium benefits:</p>
          {[
            '+1% cashback bonus on all offers',
            'Priority support',
            'Early access to new offers',
            'Cancel anytime from your profile',
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-600">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/dashboard"
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/profile"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Manage Plan
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
