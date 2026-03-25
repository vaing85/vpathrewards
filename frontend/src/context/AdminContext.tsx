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

  // On mount, restore session using the token stored in sessionStorage (or
  // fall back to the httpOnly cookie for same-origin setups).
  useEffect(() => {
    apiClient.get('/admin/auth/me')
      .then(res => setAdmin(res.data.user))
      .catch(() => {
        sessionStorage.removeItem('admin_token');
        setAdmin(null);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/admin/auth/login', { email, password });
    // Persist token so the Bearer interceptor can attach it on every admin request.
    // sessionStorage clears automatically when the browser tab/window closes.
    if (response.data.token) {
      sessionStorage.setItem('admin_token', response.data.token);
    }
    setAdmin(response.data.user);
  };

  const logout = async () => {
    await apiClient.post('/admin/auth/logout').catch(() => {});
    sessionStorage.removeItem('admin_token');
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
