import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';
import Pagination from '../../components/Pagination';

interface User {
  id: number;
  email: string;
  name: string;
  total_earnings: number;
  is_admin: number;
  created_at: string;
  transaction_count?: number;
}

const AdminUsers = () => {
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    fetchUsers();
  }, [isAuthenticated, navigate, currentPage]);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/admin/users', {
        params: { page: currentPage, limit: 20 }
      });
      
      // Handle paginated response
      if (response.data?.data) {
        setUsers(response.data.data);
        setPagination(response.data.pagination);
      } else {
        // Fallback for non-paginated response
        setUsers(response.data || []);
        setPagination(null);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiClient.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting user');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Users</h1>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ${user.total_earnings.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.transaction_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_admin ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!user.is_admin && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={pagination.total}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
