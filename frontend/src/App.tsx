import { lazy, Suspense } from 'react';
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
import SearchResults from './pages/SearchResults';
import Withdrawals from './pages/Withdrawals';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Category from './pages/Category';
import ReferralDashboard from './pages/ReferralDashboard';
import Favorites from './pages/Favorites';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionCancel from './pages/SubscriptionCancel';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';

// Phase 4: Code splitting – lazy load admin and heavy chart page
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminMerchants = lazy(() => import('./pages/admin/AdminMerchants'));
const AdminOffers = lazy(() => import('./pages/admin/AdminOffers'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminWithdrawals = lazy(() => import('./pages/admin/AdminWithdrawals'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const CashbackHistory = lazy(() => import('./pages/CashbackHistory'));

function PageFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminProvider>
          <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <Home />
                </div>
                <Footer />
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
            <Route path="/subscription/success" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <SubscriptionSuccess />
              </div>
            } />
            <Route path="/subscription/cancel" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <SubscriptionCancel />
              </div>
            } />
            <Route path="/cashback-history" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Suspense fallback={<PageFallback />}>
                  <CashbackHistory />
                </Suspense>
              </div>
            } />
            <Route path="/terms" element={
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <TermsOfService />
                </div>
                <Footer />
              </div>
            } />
            <Route path="/privacy" element={
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <PrivacyPolicy />
                </div>
                <Footer />
              </div>
            } />

            <Route path="/forgot-password" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <ForgotPassword />
              </div>
            } />
            <Route path="/reset-password" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <ResetPassword />
              </div>
            } />

            {/* Admin Routes (lazy loaded) */}
            <Route path="/admin/login" element={
              <Suspense fallback={<PageFallback />}>
                <AdminLogin />
              </Suspense>
            } />
            <Route path="/admin/dashboard" element={
              <AdminLayout>
                <Suspense fallback={<PageFallback />}>
                  <AdminDashboard />
                </Suspense>
              </AdminLayout>
            } />
            <Route path="/admin/merchants" element={
              <AdminLayout>
                <Suspense fallback={<PageFallback />}>
                  <AdminMerchants />
                </Suspense>
              </AdminLayout>
            } />
            <Route path="/admin/offers" element={
              <AdminLayout>
                <Suspense fallback={<PageFallback />}>
                  <AdminOffers />
                </Suspense>
              </AdminLayout>
            } />
            <Route path="/admin/users" element={
              <AdminLayout>
                <Suspense fallback={<PageFallback />}>
                  <AdminUsers />
                </Suspense>
              </AdminLayout>
            } />
            <Route path="/admin/withdrawals" element={
              <AdminLayout>
                <Suspense fallback={<PageFallback />}>
                  <AdminWithdrawals />
                </Suspense>
              </AdminLayout>
            } />
            <Route path="/admin/analytics" element={
              <AdminLayout>
                <Suspense fallback={<PageFallback />}>
                  <AdminAnalytics />
                </Suspense>
              </AdminLayout>
            } />
            <Route path="/admin/banners" element={
              <AdminLayout>
                <Suspense fallback={<PageFallback />}>
                  <AdminBanners />
                </Suspense>
              </AdminLayout>
            } />
            {/* 404 catch-all */}
            <Route path="*" element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <NotFound />
              </div>
            } />
          </Routes>
          <ChatWidget />
        </Router>
      </AdminProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
