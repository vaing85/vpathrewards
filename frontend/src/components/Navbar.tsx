import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import SearchBar from './SearchBar';
import { useSSE } from '../hooks/useSSE';

interface Category {
  category: string;
  count: number;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const POLL_INTERVAL = 60_000; // refresh every 60 s

const Navbar = () => {
  const { isAuthenticated, user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchCategories(); }, []);

  // Initial fetch (no more polling — SSE handles live updates)
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
  }, [isAuthenticated]);

  // Real-time via SSE
  useSSE(isAuthenticated ? token : null, (data) => {
    if (data.type === 'notification') {
      setNotifications((prev) => [{
        id: data.id as number,
        type: data.notificationType as string,
        title: data.title as string,
        message: data.message as string,
        is_read: 0,
        created_at: new Date().toISOString(),
      }, ...prev.slice(0, 49)]);
      setUnreadCount((n) => n + 1);
    }
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/search/categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (_) {}
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const notifTypeColor: Record<string, string> = {
    cashback: 'bg-green-100 text-green-700',
    withdrawal: 'bg-blue-100 text-blue-700',
    default: 'bg-gray-100 text-gray-700',
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
              <img src="/vpathlogo.svg" alt="V PATHing Rewards" className="h-8 w-auto" />
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
              {showCategories && categories.length > 0 && (
                <div
                  onMouseEnter={() => setShowCategories(true)}
                  onMouseLeave={() => setShowCategories(false)}
                  className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                >
                  {categories.map((cat) => (
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
                <Link to="/favorites" className="text-gray-700 hover:text-primary-600">
                  Favorites
                </Link>
                <Link to="/leaderboard" className="text-gray-700 hover:text-primary-600">
                  Leaderboard
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

                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifs(v => !v)}
                    className="relative p-1 text-gray-600 hover:text-primary-600 transition"
                    aria-label="Notifications"
                  >
                    <BellIcon />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifs && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                        <span className="font-semibold text-gray-800 text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-primary-600 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-gray-400">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${n.is_read ? '' : 'bg-blue-50'}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${notifTypeColor[n.type] || notifTypeColor.default}`}>
                                  {n.type}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-800">{n.title}</div>
                                  <div className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {new Date(n.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
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
                    to="/favorites"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Favorites
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Leaderboard
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
                    {unreadCount > 0 && (
                      <div className="text-xs text-red-500 mt-1">{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</div>
                    )}
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
