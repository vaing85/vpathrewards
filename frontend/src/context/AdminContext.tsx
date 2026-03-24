import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
}

interface AdminContextType {
  admin: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  // On mount, check the httpOnly admin cookie via /me to restore session
  useEffect(() => {
    apiClient.get('/admin/auth/me')
      .then(res => setAdmin(res.data.user))
      .catch(() => setAdmin(null));
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/admin/auth/login', { email, password });
    setAdmin(response.data.user);
  };

  const logout = async () => {
    await apiClient.post('/admin/auth/logout').catch(() => {});
    setAdmin(null);
    // Clear any legacy localStorage entries from previous versions
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  return (
    <AdminContext.Provider
      value={{
        admin,
        login,
        logout,
        isAuthenticated: !!admin,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
