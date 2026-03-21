import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import SearchBar from './SearchBar';

interface Category {
  category: string;
  count: number;
}

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/search/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
              <div className="bg-primary-600 text-white px-2 sm:px-3 py-1 rounded-lg font-bold text-lg sm:text-xl">
                $$$
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-800">V PATHing Rewards</span>
            </Link>
            
            {/* Categories Dropdown - Desktop only */}
            <div className="hidden md:block relative">
              <button
                onMouseEnter={() => setShowCategories(true)}
                onMouseLeave={() => setShowCategories(false)}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Categories
              </button>
              {showCategories && (
                <div
                  onMouseEnter={() => setShowCategories(true)}
                  onMouseLeave={() => setShowCategories(false)}
                  className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                >
                  {/* Featured: Travel */}
                  <Link
                    to="/travel"
                    className="flex items-center gap-2 px-4 py-2 text-blue-700 hover:bg-blue-50 font-medium transition border-b border-gray-100"
                    onClick={() => setShowCategories(false)}
                  >
                    <span>✈️</span>
                    <span>Travel</span>
                    <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Featured</span>
                  </Link>
                  {categories.filter(c => c.category !== 'Travel').map((cat) => (
                    <Link
                      key={cat.category}
                      to={`/category/${encodeURIComponent(cat.category)}`}
                      className="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition"
                      onClick={() => setShowCategories(false)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{cat.category}</span>
                        <span className="text-xs text-gray-500">({cat.count})</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Search Bar - Hidden on mobile, shown on larger screens */}
          <div className="hidden md:block flex-1 max-w-2xl mx-4">
            <SearchBar />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-primary-600">
                  Dashboard
                </Link>
                <Link to="/withdrawals" className="text-gray-700 hover:text-primary-600">
                  Withdrawals
                </Link>
                <Link to="/referrals" className="text-gray-700 hover:text-primary-600">
                  Referrals
                </Link>
                <Link to="/favorites" className="text-gray-700 hover:text-primary-600">
                  Favorites
                </Link>
                <Link to="/profile" className="text-gray-700 hover:text-primary-600">
                  Profile
                </Link>
                <div className="hidden lg:flex items-center space-x-2">
                  <span className="text-gray-700">Hi, {user?.name}</span>
                  <span className="text-primary-600 font-semibold">
                    ${user?.total_earnings?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-600 px-4 py-2"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            {/* Mobile Search */}
            <div className="mb-4 px-2">
              <SearchBar />
            </div>

            {/* Mobile Categories */}
            {categories.length > 0 && (
              <div className="mb-4 px-2">
                <div className="text-sm font-semibold text-gray-500 uppercase mb-2 px-2">Categories</div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.slice(0, 6).map((cat) => (
                    <Link
                      key={cat.category}
                      to={`/category/${encodeURIComponent(cat.category)}`}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {cat.category}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div className="space-y-1 px-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/withdrawals"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Withdrawals
                  </Link>
                  <Link
                    to="/referrals"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Referrals
                  </Link>
                  <Link
                    to="/favorites"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Favorites
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <div className="px-3 py-2 text-sm text-gray-600 border-t border-gray-200 mt-2 pt-2">
                    <div>Hi, {user?.name}</div>
                    <div className="text-primary-600 font-semibold mt-1">
                      ${user?.total_earnings?.toFixed(2) || '0.00'} earned
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 bg-primary-600 text-white rounded-lg text-center font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
