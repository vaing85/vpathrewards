import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Connection pool
// ---------------------------------------------------------------------------

const isSupabase = (process.env.DATABASE_URL || '').includes('supabase.co');
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase || isProduction ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// ---------------------------------------------------------------------------
// SQLite compatibility layer
//
// All existing routes use `?` placeholders and expect:
//   dbRun  → { lastID, changes }
//   dbGet  → single row | undefined
//   dbAll  → row[]
//
// This layer converts `?` → `$1`, `$2`, … so route files need no changes.
// ---------------------------------------------------------------------------

/** Convert SQLite `?` placeholders to PostgreSQL `$1`, `$2`, … */
const toPgSql = (sql: string): string => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

/** SQLite-compatible result returned by dbRun */
export interface RunResult {
  lastID: number;
  changes: number;
}

/**
 * Execute an INSERT / UPDATE / DELETE statement.
 * For INSERT, appends `RETURNING id` automatically so callers can use
 * `result.lastID` exactly as they did with SQLite.
 */
export const dbRun = async (sql: string, params?: any[]): Promise<RunResult> => {
  const isInsert = /^\s*INSERT\s+/i.test(sql);
  let pgSql = toPgSql(sql);

  if (isInsert) {
    // Strip trailing semicolon before appending RETURNING
    pgSql = pgSql.replace(/;\s*$/, '') + ' RETURNING id';
  }

  const result = await pool.query(pgSql, params || []);
  return {
    lastID: isInsert && result.rows.length > 0 ? Number(result.rows[0].id) : 0,
    changes: result.rowCount ?? 0,
  };
};

/** Return the first matching row, or `undefined` if none. */
export const dbGet = async (sql: string, params?: any[]): Promise<any> => {
  const result = await pool.query(toPgSql(sql), params || []);
  return result.rows[0] ?? undefined;
};

/** Return all matching rows. */
export const dbAll = async (sql: string, params?: any[]): Promise<any[]> => {
  const result = await pool.query(toPgSql(sql), params || []);
  return result.rows;
};

// ---------------------------------------------------------------------------
// Schema initialisation
// ---------------------------------------------------------------------------

export const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                      SERIAL PRIMARY KEY,
        email                   TEXT UNIQUE NOT NULL,
        password                TEXT NOT NULL,
        name                    TEXT NOT NULL,
        total_earnings          DOUBLE PRECISION DEFAULT 0,
        is_admin                INTEGER DEFAULT 0,
        notification_email      INTEGER DEFAULT 1,
        notification_cashback   INTEGER DEFAULT 1,
        notification_withdrawal INTEGER DEFAULT 1,
        notification_new_offers INTEGER DEFAULT 0,
        created_at              TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Merchants
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchants (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        logo_url    TEXT,
        website_url TEXT,
        category    TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Offers
    await client.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id             SERIAL PRIMARY KEY,
        merchant_id    INTEGER NOT NULL REFERENCES merchants(id),
        title          TEXT NOT NULL,
        description    TEXT,
        cashback_rate  DOUBLE PRECISION NOT NULL,
        terms          TEXT,
        affiliate_link TEXT NOT NULL,
        is_active      INTEGER DEFAULT 1,
        end_date       TEXT,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Cashback transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS cashback_transactions (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER NOT NULL REFERENCES users(id),
        offer_id         INTEGER NOT NULL REFERENCES offers(id),
        amount           DOUBLE PRECISION NOT NULL,
        status           TEXT DEFAULT 'pending',
        transaction_date TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Withdrawals
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id),
        amount          DOUBLE PRECISION NOT NULL,
        payment_method  TEXT NOT NULL,
        payment_details TEXT NOT NULL,
        status          TEXT DEFAULT 'pending',
        admin_notes     TEXT,
        processed_by    INTEGER REFERENCES users(id),
        requested_at    TIMESTAMPTZ DEFAULT NOW(),
        processed_at    TIMESTAMPTZ
      )
    `);

    // Referral codes
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_referral_codes (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER UNIQUE NOT NULL REFERENCES users(id),
        referral_code TEXT UNIQUE NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Referral relationships
    await client.query(`
      CREATE TABLE IF NOT EXISTS referral_relationships (
        id            SERIAL PRIMARY KEY,
        referrer_id   INTEGER NOT NULL REFERENCES users(id),
        referred_id   INTEGER UNIQUE NOT NULL REFERENCES users(id),
        referral_code TEXT NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Referral earnings
    await client.query(`
      CREATE TABLE IF NOT EXISTS referral_earnings (
        id               SERIAL PRIMARY KEY,
        referrer_id      INTEGER NOT NULL REFERENCES users(id),
        referred_id      INTEGER NOT NULL REFERENCES users(id),
        transaction_id   INTEGER REFERENCES cashback_transactions(id),
        amount           DOUBLE PRECISION NOT NULL,
        bonus_percentage DOUBLE PRECISION DEFAULT 10.0,
        status           TEXT DEFAULT 'pending',
        created_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Affiliate clicks
    await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_clicks (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER REFERENCES users(id),
        offer_id      INTEGER NOT NULL REFERENCES offers(id),
        session_id    TEXT NOT NULL,
        ip_address    TEXT,
        user_agent    TEXT,
        referrer      TEXT,
        clicked_at    TIMESTAMPTZ DEFAULT NOW(),
        converted     INTEGER DEFAULT 0,
        conversion_id INTEGER
      )
    `);

    // Conversions
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversions (
        id                SERIAL PRIMARY KEY,
        click_id          INTEGER REFERENCES affiliate_clicks(id),
        user_id           INTEGER REFERENCES users(id),
        offer_id          INTEGER NOT NULL REFERENCES offers(id),
        session_id        TEXT NOT NULL,
        order_id          TEXT,
        order_amount      DOUBLE PRECISION,
        commission_amount DOUBLE PRECISION,
        status            TEXT DEFAULT 'pending',
        conversion_date   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // User favorites (partial unique indexes handle NULL correctly in Postgres)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        offer_id    INTEGER REFERENCES offers(id),
        merchant_id INTEGER REFERENCES merchants(id),
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        CHECK (
          (offer_id IS NOT NULL AND merchant_id IS NULL) OR
          (offer_id IS NULL AND merchant_id IS NOT NULL)
        )
      )
    `);

    // Merchant reviews
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchant_reviews (
        id          SERIAL PRIMARY KEY,
        merchant_id INTEGER NOT NULL REFERENCES merchants(id),
        user_id     INTEGER NOT NULL REFERENCES users(id),
        rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment     TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (merchant_id, user_id)
      )
    `);

    // Subscriptions (Stripe)
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id                     SERIAL PRIMARY KEY,
        user_id                INTEGER UNIQUE NOT NULL REFERENCES users(id),
        stripe_customer_id     TEXT UNIQUE,
        stripe_subscription_id TEXT UNIQUE,
        plan                   TEXT DEFAULT 'free',
        status                 TEXT DEFAULT 'active',
        current_period_end     TIMESTAMPTZ,
        created_at             TIMESTAMPTZ DEFAULT NOW(),
        updated_at             TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Cashback goals
    await client.query(`
      CREATE TABLE IF NOT EXISTS cashback_goals (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL REFERENCES users(id),
        title          TEXT NOT NULL,
        target_amount  DOUBLE PRECISION NOT NULL,
        current_amount DOUBLE PRECISION DEFAULT 0,
        period_type    TEXT DEFAULT 'monthly',
        start_date     DATE,
        end_date       DATE,
        is_completed   INTEGER DEFAULT 0,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Password reset columns (added after initial schema; IF NOT EXISTS is safe to run repeatedly)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`);

    // Commission rate column on offers (your CJ payout %; cashback_rate is what user earns)
    await client.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS commission_rate DOUBLE PRECISION DEFAULT 0`);

    // ---------------------------------------------------------------------------
    // Indexes
    // ---------------------------------------------------------------------------

    const idx = (name: string, sql: string) =>
      client.query(`CREATE INDEX IF NOT EXISTS ${name} ${sql}`);

    await idx('idx_users_email',                          'ON users(email)');
    await idx('idx_users_is_admin',                       'ON users(is_admin)');
    await idx('idx_merchants_category',                   'ON merchants(category)');
    await idx('idx_merchants_name',                       'ON merchants(name)');
    await idx('idx_offers_merchant_id',                   'ON offers(merchant_id)');
    await idx('idx_offers_is_active',                     'ON offers(is_active)');
    await idx('idx_offers_cashback_rate',                 'ON offers(cashback_rate)');
    await idx('idx_offers_created_at',                    'ON offers(created_at)');
    await idx('idx_cashback_user_id',                     'ON cashback_transactions(user_id)');
    await idx('idx_cashback_offer_id',                    'ON cashback_transactions(offer_id)');
    await idx('idx_cashback_status',                      'ON cashback_transactions(status)');
    await idx('idx_cashback_transaction_date',            'ON cashback_transactions(transaction_date)');
    await idx('idx_clicks_user_id',                       'ON affiliate_clicks(user_id)');
    await idx('idx_clicks_offer_id',                      'ON affiliate_clicks(offer_id)');
    await idx('idx_clicks_clicked_at',                    'ON affiliate_clicks(clicked_at)');
    await idx('idx_clicks_converted',                     'ON affiliate_clicks(converted)');
    await idx('idx_conversions_user_id',                  'ON conversions(user_id)');
    await idx('idx_conversions_offer_id',                 'ON conversions(offer_id)');
    await idx('idx_conversions_status',                   'ON conversions(status)');
    await idx('idx_conversions_conversion_date',          'ON conversions(conversion_date)');
    await idx('idx_conversions_click_id',                 'ON conversions(click_id)');
    await idx('idx_withdrawals_user_id',                  'ON withdrawals(user_id)');
    await idx('idx_withdrawals_status',                   'ON withdrawals(status)');
    await idx('idx_withdrawals_requested_at',             'ON withdrawals(requested_at)');
    await idx('idx_referral_relationships_referrer_id',   'ON referral_relationships(referrer_id)');
    await idx('idx_referral_relationships_referred_id',   'ON referral_relationships(referred_id)');
    await idx('idx_referral_earnings_referrer_id',        'ON referral_earnings(referrer_id)');
    await idx('idx_referral_earnings_status',             'ON referral_earnings(status)');
    await idx('idx_favorites_user_id',                    'ON user_favorites(user_id)');
    await idx('idx_merchant_reviews_merchant_id',         'ON merchant_reviews(merchant_id)');
    await idx('idx_merchant_reviews_user_id',             'ON merchant_reviews(user_id)');
    await idx('idx_merchant_reviews_rating',              'ON merchant_reviews(rating)');
    await idx('idx_goals_user_id',                        'ON cashback_goals(user_id)');
    await idx('idx_goals_is_completed',                   'ON cashback_goals(is_completed)');
    await idx('idx_goals_user_created',                   'ON cashback_goals(user_id, created_at)');
    await idx('idx_subscriptions_user_id',                'ON subscriptions(user_id)');
    await idx('idx_subscriptions_stripe_customer',        'ON subscriptions(stripe_customer_id)');
    await idx('idx_subscriptions_plan_status',            'ON subscriptions(plan, status)');

    // Partial unique indexes for user_favorites (handles NULLs correctly in Postgres)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_offer
        ON user_favorites(user_id, offer_id)
        WHERE offer_id IS NOT NULL
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_merchant
        ON user_favorites(user_id, merchant_id)
        WHERE merchant_id IS NOT NULL
    `);

    await client.query('COMMIT');
    console.log('Database schema initialised successfully');

    // ---------------------------------------------------------------------------
    // Seed data (outside transaction so partial failures don't roll back schema)
    // ---------------------------------------------------------------------------

    // Default admin
    const adminExists = await dbGet('SELECT id FROM users WHERE email = ?', ['admin@cashback.com']);
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const result = await dbRun(
        'INSERT INTO users (email, password, name, is_admin) VALUES (?, ?, ?, ?)',
        ['admin@cashback.com', hashedPassword, 'Admin User', 1]
      );
      const adminId = result.lastID;
      await dbRun(
        'INSERT INTO user_referral_codes (user_id, referral_code) VALUES (?, ?)',
        [adminId, `ADMIN${adminId}`]
      );
      console.log('Default admin created: admin@cashback.com / admin123');
    }

    // No sample data seeded — merchants and offers are added via the admin panel

    console.log('Database initialised successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initialising database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Export pool for any advanced use-cases
export { pool as db };
