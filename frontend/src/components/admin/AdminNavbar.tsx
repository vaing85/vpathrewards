import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

const AdminNavbar = () => {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/admin/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold">Admin Panel</span>
            </Link>
            <div className="flex space-x-4">
              <Link
                to="/admin/dashboard"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Dashboard
              </Link>
              <Link
                to="/admin/merchants"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Merchants
              </Link>
              <Link
                to="/admin/offers"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Offers
              </Link>
              <Link
                to="/admin/users"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Users
              </Link>
              <Link
                to="/admin/withdrawals"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Withdrawals
              </Link>
              <Link
                to="/admin/banners"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Banners
              </Link>
              <Link
                to="/admin/cashback"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Cashback
              </Link>
              <Link
                to="/admin/analytics"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Analytics
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">{admin?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
