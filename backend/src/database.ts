import bcrypt from 'bcryptjs';
import { dbRun, dbGet, dbAll, USE_PG } from './db';
export { dbRun, dbGet, dbAll };

/** Adapt SQLite DDL to PostgreSQL when running on PG. */
function ddl(sql: string): string {
  if (!USE_PG) return sql;
  return sql
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/\bDATETIME\b/gi, 'TIMESTAMPTZ')
    .replace(/\bREAL\b/gi, 'DOUBLE PRECISION');
}

/** Add a column only if it doesn't already exist (PG: IF NOT EXISTS; SQLite: try/catch). */
async function addCol(table: string, col: string, def: string): Promise<void> {
  if (USE_PG) {
    await dbRun(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${def}`);
  } else {
    try { await dbRun(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch (_) {}
  }
}

export const initDatabase = async () => {
  try {
    // SQLite only — PostgreSQL enforces FK constraints via constraints, not PRAGMA
    if (!USE_PG) {
      await dbRun('PRAGMA foreign_keys = ON');
    }

    await dbRun(ddl(`
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
    `));

    await dbRun(ddl(`
      CREATE TABLE IF NOT EXISTS merchants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        logo_url TEXT,
        website_url TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));

    await dbRun(ddl(`
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
    `));

    await dbRun(ddl(`
      CREATE TABLE IF NOT EXISTS cashback_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        offer_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        platform_amount REAL DEFAULT 0,
        user_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (offer_id) REFERENCES offers(id)
      )
    `));

    await dbRun(ddl(`
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
    `));

    await dbRun(ddl(`
      CREATE TABLE IF NOT EXISTS user_referral_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        referral_code TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `));

    await dbRun(ddl(`
      CREATE TABLE IF NOT EXISTS referral_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_id INTEGER NOT NULL,
        referred_id INTEGER UNIQUE NOT NULL,
        referral_code TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referrer_id) REFERENCES users(id),
        FOREIGN KEY (referred_id) REFERENCES users(id)
      )
    `));

    await dbRun(ddl(`
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
    `));

    await dbRun(ddl(`
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
    `));

    await dbRun(ddl(`
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
    `));

    await dbRun(ddl(`
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
    `));

    await dbRun(ddl(`
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
    `));

    await dbRun(ddl(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        commission_type TEXT NOT NULL DEFAULT 'percentage',
        platform_share REAL NOT NULL DEFAULT 25.0,
        flat_amount REAL NOT NULL DEFAULT 0.0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));

    const settingsExist = await dbGet('SELECT id FROM platform_settings WHERE id = 1');
    if (!settingsExist) {
      await dbRun(
        'INSERT INTO platform_settings (id, commission_type, platform_share, flat_amount) VALUES (1, ?, ?, ?)',
        ['percentage', 25.0, 0.0]
      );
    }

    await dbRun(ddl(`
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
    `));

    await dbRun(ddl(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        status TEXT NOT NULL DEFAULT 'active',
        current_period_start DATETIME,
        current_period_end DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `));

    await dbRun(ddl(`
      CREATE TABLE IF NOT EXISTS cashback_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        merchant_id INTEGER,
        offer_id INTEGER,
        alert_type TEXT NOT NULL DEFAULT 'rate_increase',
        threshold_rate REAL,
        is_active INTEGER DEFAULT 1,
        last_triggered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (merchant_id) REFERENCES merchants(id),
        FOREIGN KEY (offer_id) REFERENCES offers(id)
      )
    `));

    await dbRun(ddl(`
      CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        stripe_account_id TEXT NOT NULL,
        onboarding_complete INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `));

    // Add optional columns to existing tables (idempotent)
    await addCol('users', 'leaderboard_opt_in', 'INTEGER DEFAULT 0');
    await addCol('users', 'stripe_customer_id', 'TEXT');
    await addCol('users', 'stripe_subscription_id', 'TEXT');
    await addCol('users', 'subscription_plan', "TEXT DEFAULT 'free'");
    await addCol('users', 'subscription_status', "TEXT DEFAULT 'active'");
    await addCol('withdrawals', 'stripe_transfer_id', 'TEXT');

    // Indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_merchants_name ON merchants(name)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_offers_merchant_id ON offers(merchant_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_offers_is_active ON offers(is_active)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_offers_cashback_rate ON offers(cashback_rate)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_cashback_user_id ON cashback_transactions(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_cashback_offer_id ON cashback_transactions(offer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_cashback_status ON cashback_transactions(status)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_cashback_transaction_date ON cashback_transactions(transaction_date)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_clicks_user_id ON affiliate_clicks(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_clicks_offer_id ON affiliate_clicks(offer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_clicks_converted ON affiliate_clicks(converted)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_conversions_user_id ON conversions(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_conversions_offer_id ON conversions(offer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer_id ON referral_relationships(referrer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred_id ON referral_relationships(referred_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id ON referral_earnings(referrer_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON referral_earnings(status)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON user_favorites(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_goals_user_id ON cashback_goals(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON cashback_alerts(user_id)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON cashback_alerts(is_active)');

    // Seed default admin user
    const adminExists = await dbGet('SELECT id FROM users WHERE email = ?', ['admin@cashback.com']) as { id: number } | undefined;
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const result = await dbRun(
        'INSERT INTO users (email, password, name, is_admin) VALUES (?, ?, ?, ?)',
        ['admin@cashback.com', hashedPassword, 'Admin User', 1]
      );
      const adminId = (result as any).lastID;
      await dbRun(
        'INSERT INTO user_referral_codes (user_id, referral_code) VALUES (?, ?)',
        [adminId, `ADMIN${adminId}`]
      );
      console.log('Default admin created: admin@cashback.com / admin123');
    }

    // Seed sample merchants/offers
    const merchantCount = await dbGet('SELECT COUNT(*) as count FROM merchants') as { count: number };
    if (merchantCount.count === 0) {
      const merchants = [
        ['Amazon', 'Shop millions of products', 'https://logo.clearbit.com/amazon.com', 'https://amazon.com', 'E-commerce'],
        ['Target', 'Expect more. Pay less.', 'https://logo.clearbit.com/target.com', 'https://target.com', 'Retail'],
        ['Best Buy', 'Electronics and tech', 'https://logo.clearbit.com/bestbuy.com', 'https://bestbuy.com', 'Electronics'],
        ['Walmart', 'Save money. Live better.', 'https://logo.clearbit.com/walmart.com', 'https://walmart.com', 'Retail'],
        ['Nike', 'Just do it', 'https://logo.clearbit.com/nike.com', 'https://nike.com', 'Fashion'],
      ];
      const rates = [2.5, 3.0, 4.0, 5.0, 6.0];
      for (let i = 0; i < merchants.length; i++) {
        const m = merchants[i];
        const r = await dbRun(
          'INSERT INTO merchants (name, description, logo_url, website_url, category) VALUES (?, ?, ?, ?, ?)',
          m
        );
        const mid = (r as any).lastID;
        const rate = rates[i];
        await dbRun(
          'INSERT INTO offers (merchant_id, title, description, cashback_rate, terms, affiliate_link) VALUES (?, ?, ?, ?, ?, ?)',
          [mid, `${rate}% Cashback`, `Get ${rate}% cashback on all purchases`, rate, 'Valid for 30 days. Minimum purchase $10.', `https://example.com/affiliate/${mid}`]
        );
      }
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};
