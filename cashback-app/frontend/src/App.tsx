import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import AdminLayout from './components/admin/AdminLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MerchantDetail from './pages/MerchantDetail';
import OfferDetail from './pages/OfferDetail';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMerchants from './pages/admin/AdminMerchants';
import AdminOffers from './pages/admin/AdminOffers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import SearchResults from './pages/SearchResults';
import Withdrawals from './pages/Withdrawals';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Category from './pages/Category';
import ReferralDashboard from './pages/ReferralDashboard';
import Favorites from './pages/Favorites';
import CashbackHistory from './pages/CashbackHistory';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminProvider>
          <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Home />
              </div>
            } />
            <Route path="/login" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Login />
              </div>
            } />
            <Route path="/register" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Register />
              </div>
            } />
            <Route path="/dashboard" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Dashboard />
              </div>
            } />
            <Route path="/merchants/:id" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <MerchantDetail />
              </div>
            } />
            <Route path="/offers/:id" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <OfferDetail />
              </div>
            } />
            <Route path="/search" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <SearchResults />
              </div>
            } />
            <Route path="/category/:category" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Category />
              </div>
            } />
            <Route path="/withdrawals" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Withdrawals />
              </div>
            } />
            <Route path="/analytics" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Analytics />
              </div>
            } />
            <Route path="/profile" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Profile />
              </div>
            } />
            <Route path="/referrals" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <ReferralDashboard />
              </div>
            } />
            <Route path="/favorites" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Favorites />
              </div>
            } />
            <Route path="/cashback-history" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <CashbackHistory />
              </div>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            } />
            <Route path="/admin/merchants" element={
              <AdminLayout>
                <AdminMerchants />
              </AdminLayout>
            } />
            <Route path="/admin/offers" element={
              <AdminLayout>
                <AdminOffers />
              </AdminLayout>
            } />
            <Route path="/admin/users" element={
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            } />
            <Route path="/admin/withdrawals" element={
              <AdminLayout>
                <AdminWithdrawals />
              </AdminLayout>
            } />
            <Route path="/admin/analytics" element={
              <AdminLayout>
                <AdminAnalytics />
              </AdminLayout>
            } />
          </Routes>
        </Router>
      </AdminProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
