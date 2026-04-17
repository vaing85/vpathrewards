import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import AdminLayout from './components/admin/AdminLayout';
import LoadingSpinner from './components/LoadingSpinner';

// Always-loaded (small, critical path)
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy-loaded user pages
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const MerchantDetail   = lazy(() => import('./pages/MerchantDetail'));
const OfferDetail      = lazy(() => import('./pages/OfferDetail'));
const SearchResults    = lazy(() => import('./pages/SearchResults'));
const Withdrawals      = lazy(() => import('./pages/Withdrawals'));
const Analytics        = lazy(() => import('./pages/Analytics'));
const Profile          = lazy(() => import('./pages/Profile'));
const Category         = lazy(() => import('./pages/Category'));
const ReferralDashboard = lazy(() => import('./pages/ReferralDashboard'));
const Favorites        = lazy(() => import('./pages/Favorites'));
const CashbackHistory  = lazy(() => import('./pages/CashbackHistory'));
const Leaderboard      = lazy(() => import('./pages/Leaderboard'));

// Lazy-loaded admin pages
const AdminLogin       = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard   = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminMerchants   = lazy(() => import('./pages/admin/AdminMerchants'));
const AdminOffers      = lazy(() => import('./pages/admin/AdminOffers'));
const AdminUsers       = lazy(() => import('./pages/admin/AdminUsers'));
const AdminWithdrawals = lazy(() => import('./pages/admin/AdminWithdrawals'));
const AdminAnalytics   = lazy(() => import('./pages/admin/AdminAnalytics'));

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    {children}
  </div>
);

const PageFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminProvider>
          <Router>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<PageShell><Home /></PageShell>} />
                <Route path="/login" element={<PageShell><Login /></PageShell>} />
                <Route path="/register" element={<PageShell><Register /></PageShell>} />
                <Route path="/dashboard" element={<PageShell><Dashboard /></PageShell>} />
                <Route path="/merchants/:id" element={<PageShell><MerchantDetail /></PageShell>} />
                <Route path="/offers/:id" element={<PageShell><OfferDetail /></PageShell>} />
                <Route path="/search" element={<PageShell><SearchResults /></PageShell>} />
                <Route path="/category/:category" element={<PageShell><Category /></PageShell>} />
                <Route path="/withdrawals" element={<PageShell><Withdrawals /></PageShell>} />
                <Route path="/analytics" element={<PageShell><Analytics /></PageShell>} />
                <Route path="/profile" element={<PageShell><Profile /></PageShell>} />
                <Route path="/referrals" element={<PageShell><ReferralDashboard /></PageShell>} />
                <Route path="/favorites" element={<PageShell><Favorites /></PageShell>} />
                <Route path="/cashback-history" element={<PageShell><CashbackHistory /></PageShell>} />
                <Route path="/leaderboard" element={<PageShell><Leaderboard /></PageShell>} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                <Route path="/admin/merchants" element={<AdminLayout><AdminMerchants /></AdminLayout>} />
                <Route path="/admin/offers" element={<AdminLayout><AdminOffers /></AdminLayout>} />
                <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
                <Route path="/admin/withdrawals" element={<AdminLayout><AdminWithdrawals /></AdminLayout>} />
                <Route path="/admin/analytics" element={<AdminLayout><AdminAnalytics /></AdminLayout>} />
              </Routes>
            </Suspense>
          </Router>
        </AdminProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
