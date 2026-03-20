import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
    <div className="text-center max-w-md">
      <p className="text-8xl font-bold text-primary-200 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Page not found</h1>
      <p className="text-gray-500 mb-8">That page doesn't exist or may have moved.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/"
          className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Go Home
        </Link>
        <Link
          to="/search"
          className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          Browse Deals
        </Link>
      </div>
    </div>
  </div>
);

export default NotFound;
