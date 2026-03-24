import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { initDatabase, dbGet } from './database';
import { appConfig } from './config/appConfig';
import { securityConfig } from './config/securityConfig';
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
import statsRoutes from './routes/stats';
import adminAuthRoutes from './routes/admin/auth';
import adminMerchantRoutes from './routes/admin/merchants';
import adminOfferRoutes from './routes/admin/offers';
import adminUserRoutes from './routes/admin/users';
import adminDashboardRoutes from './routes/admin/dashboard';
import adminWithdrawalRoutes from './routes/admin/withdrawals';
import adminAnalyticsRoutes from './routes/admin/analytics';
import adminCashbackRoutes from './routes/admin/cashback';
import adminJobsRoutes from './routes/admin/jobs';
import adminBannerRoutes from './routes/admin/banners';
import subscriptionRoutes from './routes/subscriptions';
import webhookRoutes from './routes/webhooks';
import supportRoutes from './routes/support';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = appConfig.port;

// Trust Railway's proxy (fixes rate limiter X-Forwarded-For warning)
app.set('trust proxy', 1);

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
  origin: securityConfig.cors.origin,
  credentials: securityConfig.cors.credentials,
  methods: [...securityConfig.cors.methods],
  allowedHeaders: [...securityConfig.cors.allowedHeaders],
}));

// Stripe webhook — must be registered BEFORE express.json() to get raw body
app.use('/api/webhooks', webhookRoutes);

// Cookie parsing (must come before auth middleware)
app.use(cookieParser());

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
app.use('/api/stats', statsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/support', supportRoutes);

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
app.use('/api/admin/jobs', adminJobsRoutes);
app.use('/api/admin/banners', adminBannerRoutes);

// Health check (Phase 4: includes DB check for deployment/monitoring)
app.get('/api/health', async (req, res) => {
  try {
    await dbGet('SELECT 1');
    res.json({ status: 'ok', message: 'V PATHing Rewards API is running', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Database unavailable', database: 'disconnected' });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 V PATHing Rewards API Server`);
    console.log('='.repeat(60));
    console.log(`Environment: ${appConfig.nodeEnv}`);
    console.log(`Port: ${PORT}`);
    console.log(`Frontend URL: ${appConfig.frontendUrl}`);
    console.log(`Health Check: http://localhost:${PORT}/api/health`);
    
    if (appConfig.isProduction) {
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
