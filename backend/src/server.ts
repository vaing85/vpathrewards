import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase } from './database';
import { apiLimiter, authLimiter, passwordLimiter, withdrawalLimiter, adminLimiter } from './middleware/rateLimiter';
import { sanitizeInput, securityHeaders } from './middleware/security';
import authRoutes from './routes/auth';
import merchantRoutes from './routes/merchants';
import offerRoutes from './routes/offers';
import cashbackRoutes from './routes/cashback';
import searchRoutes from './routes/search';
import withdrawalRoutes from './routes/withdrawals';
import trackingRoutes from './routes/tracking';
import profileRoutes from './routes/profile';
import featuredRoutes from './routes/featured';
import referralRoutes from './routes/referrals';
import favoritesRoutes from './routes/favorites';
import analyticsRoutes from './routes/analytics';
import adminAuthRoutes from './routes/admin/auth';
import adminMerchantRoutes from './routes/admin/merchants';
import adminOfferRoutes from './routes/admin/offers';
import adminUserRoutes from './routes/admin/users';
import adminDashboardRoutes from './routes/admin/dashboard';
import adminWithdrawalRoutes from './routes/admin/withdrawals';
import adminAnalyticsRoutes from './routes/admin/analytics';
import adminCashbackRoutes from './routes/admin/cashback';
import adminCommissionRoutes from './routes/admin/commissionSettings';
import notificationRoutes from './routes/notifications';
import statsRoutes from './routes/stats';
import supportRoutes from './routes/support';
import subscriptionRoutes from './routes/subscriptions';
import webhookRoutes from './routes/webhooks';
import stripeConnectRoutes from './routes/stripeConnect';
import recommendationsRoutes from './routes/recommendations';
import alertsRoutes from './routes/alerts';
import leaderboardRoutes from './routes/leaderboard';
import adminInsightsRoutes from './routes/admin/insights';
import sseRoutes from './routes/sse';
import { startJobs } from './jobs';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Railway / reverse-proxy headers so express-rate-limit can read the real client IP
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware (apply before other middleware)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API
}));

// Additional security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Raw body for Stripe webhooks (must come before express.json)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Apply rate limiting to all routes
app.use('/api', apiLimiter);

// Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/cashback', cashbackRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/withdrawals', withdrawalLimiter, withdrawalRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/featured', featuredRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/analytics', analyticsRoutes);

// Admin routes with admin rate limiter
app.use('/api/admin', adminLimiter);
app.use('/api/admin/auth', authLimiter, adminAuthRoutes);
app.use('/api/admin/merchants', adminMerchantRoutes);
app.use('/api/admin/offers', adminOfferRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/withdrawals', adminWithdrawalRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/cashback', adminCashbackRoutes);
app.use('/api/admin/commission', adminCommissionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/stripe-connect', stripeConnectRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin/insights', adminLimiter, adminInsightsRoutes);
app.use('/api/sse', sseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cashback API is running' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
initDatabase().then(() => {
  startJobs();
  app.listen(PORT, () => {
    const env = process.env.NODE_ENV || 'development';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    console.log('='.repeat(60));
    console.log(`🚀 Cashback Rewards API Server`);
    console.log('='.repeat(60));
    console.log(`Environment: ${env}`);
    console.log(`Port: ${PORT}`);
    console.log(`Frontend URL: ${frontendUrl}`);
    console.log(`Health Check: http://localhost:${PORT}/api/health`);
    
    if (env === 'production') {
      console.log('⚠️  Production Mode: Ensure all security settings are configured!');
      console.log('   - JWT_SECRET is set and secure');
      console.log('   - SMTP is configured');
      console.log('   - CORS is restricted to production domain');
      console.log('   - Rate limits are appropriate');
    }
    
    console.log('='.repeat(60));
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
