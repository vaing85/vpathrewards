import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

// Database file will be created in the backend directory
// When compiled, __dirname points to dist/, so we go up one level
const dbPath = path.join(__dirname, '..', 'cashback.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    console.error('Database path attempted:', dbPath);
  } else {
    console.log('Database connected successfully');
  }
});

// Promisify database methods
const dbRun = (sql: string, params?: any[]): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql: string, params?: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params || [], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql: string, params?: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params || [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const initDatabase = async () => {
  try {
    // Enable foreign keys
    await dbRun('PRAGMA foreign_keys = ON');
  
  // Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      total_earnings REAL DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      notification_email INTEGER DEFAULT 1,
      notification_cashback INTEGER DEFAULT 1,
      notification_withdrawal INTEGER DEFAULT 1,
      notification_new_offers INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Merchants table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS merchants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      logo_url TEXT,
      website_url TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Offers table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cashback_rate REAL NOT NULL,
      terms TEXT,
      affiliate_link TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    )
  `);

  // Cashback transactions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS cashback_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      offer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (offer_id) REFERENCES offers(id)
    )
  `);

  // Withdrawals table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_details TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      processed_by INTEGER,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    )
  `);

  // User referral codes table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_referral_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      referral_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Referral relationships table (who referred whom)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS referral_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER UNIQUE NOT NULL,
      referral_code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id)
    )
  `);

  // Referral earnings table (track earnings from referrals)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS referral_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      transaction_id INTEGER,
      amount REAL NOT NULL,
      bonus_percentage REAL DEFAULT 10.0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id),
      FOREIGN KEY (transaction_id) REFERENCES cashback_transactions(id)
    )
  `);

  // Click tracking table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS affiliate_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      offer_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      converted INTEGER DEFAULT 0,
      conversion_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (offer_id) REFERENCES offers(id)
    )
  `);

  // Conversions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      click_id INTEGER,
      user_id INTEGER,
      offer_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      order_id TEXT,
      order_amount REAL,
      commission_amount REAL,
      status TEXT DEFAULT 'pending',
      conversion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (click_id) REFERENCES affiliate_clicks(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (offer_id) REFERENCES offers(id)
    )
  `);

  // User favorites table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      offer_id INTEGER,
      merchant_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (offer_id) REFERENCES offers(id),
      FOREIGN KEY (merchant_id) REFERENCES merchants(id),
      UNIQUE(user_id, offer_id),
      UNIQUE(user_id, merchant_id),
      CHECK((offer_id IS NOT NULL AND merchant_id IS NULL) OR (offer_id IS NULL AND merchant_id IS NOT NULL))
    )
  `);

  // Cashback goals table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS cashback_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      period_type TEXT DEFAULT 'monthly',
      start_date DATE,
      end_date DATE,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Platform commission settings table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      commission_type TEXT NOT NULL DEFAULT 'percentage',
      platform_share REAL NOT NULL DEFAULT 25.0,
      flat_amount REAL NOT NULL DEFAULT 0.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Seed default commission settings if not present
  const settingsExist = await dbGet('SELECT id FROM platform_settings WHERE id = 1');
  if (!settingsExist) {
    await dbRun(
      'INSERT INTO platform_settings (id, commission_type, platform_share, flat_amount) VALUES (1, ?, ?, ?)',
      ['percentage', 25.0, 0.0]
    );
  }

  // Add platform_amount / user_amount columns to cashback_transactions if missing
  try {
    await dbRun('ALTER TABLE cashback_transactions ADD COLUMN platform_amount REAL DEFAULT 0');
  } catch (_) { /* column already exists */ }
  try {
    await dbRun('ALTER TABLE cashback_transactions ADD COLUMN user_amount REAL DEFAULT 0');
  } catch (_) { /* column already exists */ }

  // Notifications table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create default admin user if it doesn't exist
  const adminExists = await dbGet('SELECT id FROM users WHERE email = ?', ['admin@cashback.com']) as { id: number } | undefined;
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const result = await dbRun(
      'INSERT INTO users (email, password, name, is_admin) VALUES (?, ?, ?, ?)',
      ['admin@cashback.com', hashedPassword, 'Admin User', 1]
    );
    const adminId = (result as any).lastID;
    // Create referral code for admin
    const adminCode = `ADMIN${adminId}`;
    await dbRun(
      'INSERT INTO user_referral_codes (user_id, referral_code) VALUES (?, ?)',
      [adminId, adminCode]
    );
    console.log('Default admin created: admin@cashback.com / admin123');
  }

  // Seed initial data
  const merchantCount = await dbGet('SELECT COUNT(*) as count FROM merchants') as { count: number };
  
  if (merchantCount.count === 0) {
    // Insert sample merchants
    await dbRun(`
      INSERT INTO merchants (name, description, logo_url, website_url, category)
      VALUES 
        ('Amazon', 'Shop millions of products', 'https://logo.clearbit.com/amazon.com', 'https://amazon.com', 'E-commerce'),
        ('Target', 'Expect more. Pay less.', 'https://logo.clearbit.com/target.com', 'https://target.com', 'Retail'),
        ('Best Buy', 'Electronics and tech', 'https://logo.clearbit.com/bestbuy.com', 'https://bestbuy.com', 'Electronics'),
        ('Walmart', 'Save money. Live better.', 'https://logo.clearbit.com/walmart.com', 'https://walmart.com', 'Retail'),
        ('Nike', 'Just do it', 'https://logo.clearbit.com/nike.com', 'https://nike.com', 'Fashion')
    `);

    // Insert sample offers
    const merchants = await dbAll('SELECT id FROM merchants') as { id: number }[];
    
    for (const merchant of merchants) {
      const cashbackRates = [2.5, 3.0, 4.0, 5.0, 6.0];
      const rate = cashbackRates[Math.floor(Math.random() * cashbackRates.length)];
      
      await dbRun(`
        INSERT INTO offers (merchant_id, title, description, cashback_rate, terms, affiliate_link)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        merchant.id,
        `${rate}% Cashback`,
        `Get ${rate}% cashback on all purchases`,
        rate,
        'Valid for 30 days. Minimum purchase $10.',
        `https://example.com/affiliate/${merchant.id}`
      ]);
    }
  }

    // Create indexes for performance
    console.log('Creating database indexes...');
    
    // Users table indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin)');
    
    // Merchants table indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_merchants_name ON merchants(name)');
    
    // Offers table indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_offers_merchant_id ON offers(merchant_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_offers_is_active ON offers(is_active)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_offers_cashback_rate ON offers(cashback_rate)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at)');
    
    // Cashback transactions indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_cashback_user_id ON cashback_transactions(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_cashback_offer_id ON cashback_transactions(offer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_cashback_status ON cashback_transactions(status)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_cashback_transaction_date ON cashback_transactions(transaction_date)');
    
    // Affiliate clicks indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_clicks_user_id ON affiliate_clicks(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_clicks_offer_id ON affiliate_clicks(offer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON affiliate_clicks(clicked_at)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_clicks_converted ON affiliate_clicks(converted)');
    
    // Conversions indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_conversions_user_id ON conversions(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_conversions_offer_id ON conversions(offer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_conversions_conversion_date ON conversions(conversion_date)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_conversions_click_id ON conversions(click_id)');
    
    // Withdrawals indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_withdrawals_requested_at ON withdrawals(requested_at)');
    
    // Referral relationships indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer_id ON referral_relationships(referrer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred_id ON referral_relationships(referred_id)');
    
    // Referral earnings indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id ON referral_earnings(referrer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON referral_earnings(status)');
    
    // User favorites indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON user_favorites(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_favorites_offer_id ON user_favorites(offer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_favorites_merchant_id ON user_favorites(merchant_id)');
    
    // Cashback goals indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_goals_user_id ON cashback_goals(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_goals_is_completed ON cashback_goals(is_completed)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_goals_user_created ON cashback_goals(user_id, created_at)');

    // Notifications indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)');

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export { db, dbRun, dbGet, dbAll };
