import { Link } from 'react-router-dom';

const SubscriptionCancel = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mx-auto mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout Cancelled</h1>
        <p className="text-gray-500 mb-8">
          No worries — you haven't been charged. You can upgrade to Premium any time from your profile.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/profile"
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Try Again
          </Link>
          <Link
            to="/dashboard"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancel;
