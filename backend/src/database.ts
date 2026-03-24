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

    // Merchant banners
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchant_banners (
        id          SERIAL PRIMARY KEY,
        merchant_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        image_url   TEXT NOT NULL,
        click_url   TEXT,
        width       INTEGER,
        height      INTEGER,
        alt_text    TEXT,
        is_active   INTEGER DEFAULT 1,
        created_at  TIMESTAMPTZ DEFAULT NOW()
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
    // Column migrations — run outside transaction (PgBouncer DDL limitation)
    // ---------------------------------------------------------------------------

    const migrations = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`,
      `ALTER TABLE offers ADD COLUMN IF NOT EXISTS commission_rate DOUBLE PRECISION DEFAULT 0`,
      `ALTER TABLE offers ADD COLUMN IF NOT EXISTS cashback_type TEXT DEFAULT 'percentage'`,
      `ALTER TABLE offers ADD COLUMN IF NOT EXISTS excluded_states TEXT`,
      `ALTER TABLE offers ADD COLUMN IF NOT EXISTS category TEXT`,
    ];
    for (const sql of migrations) {
      try {
        await client.query(sql);
      } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          console.warn('Migration warning:', e.message);
        }
      }
    }

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

    // ---------------------------------------------------------------------------
    // Affiliate merchant + offer seeds (idempotent — skipped if already present)
    // ---------------------------------------------------------------------------

    const seedMerchantsOffers = async (
      merchant: { name: string; description: string; website: string; category: string },
      offers: { title: string; description: string; affiliate_url: string; cashback_rate: number; commission_rate: number }[]
    ) => {
      let m = await dbGet('SELECT id FROM merchants WHERE name = ?', [merchant.name]) as any;
      if (!m) {
        const r = await dbRun(
          'INSERT INTO merchants (name, description, website_url, category) VALUES (?, ?, ?, ?)',
          [merchant.name, merchant.description, merchant.website, merchant.category]
        );
        m = { id: r.lastID };
        console.log(`Seeded merchant: ${merchant.name}`);
      }
      for (const offer of offers) {
        const exists = await dbGet('SELECT id FROM offers WHERE merchant_id = ? AND title = ?', [m.id, offer.title]);
        if (!exists) {
          await dbRun(
            'INSERT INTO offers (merchant_id, title, description, affiliate_link, cashback_rate, commission_rate, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [m.id, offer.title, offer.description, offer.affiliate_url, offer.cashback_rate, offer.commission_rate]
          );
        }
      }
    };

    // Hotels.com — 4% CJ commission on hotels, offering 2% cashback
    await seedMerchantsOffers(
      { name: 'Hotels.com', description: 'Book hotels and earn cash back on every stay.', website: 'https://www.hotels.com', category: 'Travel' },
      [
        { title: 'No Cancellation Fees — Book Now and Save', description: 'Save more with no Hotels.com cancellation fees on bookings.', affiliate_url: 'https://www.tkqlhce.com/click-101708885-10671873', cashback_rate: 2, commission_rate: 4 },
        { title: 'Last Minute Hotel Deals — Book Now and Save', description: 'Book now and save with hotel discounts on last minute escapes.', affiliate_url: 'https://www.jdoqocy.com/click-101708885-13211632', cashback_rate: 2, commission_rate: 4 },
        { title: 'Book Now and Save at Hotels.com', description: 'Find great hotel deals and book now at Hotels.com.', affiliate_url: 'https://www.dpbolvw.net/click-101708885-10772148', cashback_rate: 2, commission_rate: 4 },
        { title: 'Hotels.com Rewards — Stay 10 Nights, Earn 1 Free', description: 'Stay 10 nights, earn 1 free night with Hotels.com Rewards. Plus unlock secret member prices.', affiliate_url: 'https://www.tkqlhce.com/click-101708885-12232878', cashback_rate: 2, commission_rate: 4 },
        { title: 'Student Discount — Save 10% with Verified ID', description: 'Students save 10% off hotel bookings with verified student ID.', affiliate_url: 'https://www.jdoqocy.com/click-101708885-13799334', cashback_rate: 2, commission_rate: 4 },
        { title: 'Save 10% or More with Member Prices', description: 'Sign up and unlock member-only prices — save 10% or more on hotels.', affiliate_url: 'https://www.kqzyfj.com/click-101708885-15612526', cashback_rate: 2, commission_rate: 4 },
        { title: 'Hotels.com Evergreen — Best Hotel Deals', description: 'Browse and book the best hotel deals on Hotels.com. Great rates guaranteed.', affiliate_url: 'https://www.jdoqocy.com/click-101708885-15734399', cashback_rate: 2, commission_rate: 4 },
        { title: 'Nature Destinations — Save on Outdoor Travel', description: 'Save on your next trip to the great outdoors. Free cancellations on most hotels.', affiliate_url: 'https://www.anrdoezrs.net/click-101708885-15087887', cashback_rate: 2, commission_rate: 4 },
        { title: 'Hotels, Vacation Rentals, Resorts & More', description: 'Book the perfect hotel, vacation rental, resort or treehouse. Free cancellations on most hotels.', affiliate_url: 'https://www.jdoqocy.com/click-101708885-14035236', cashback_rate: 2, commission_rate: 4 },
        { title: 'Hotels.com Best Hotel Deals Search', description: 'Search for the best hotel deals at Hotels.com.', affiliate_url: 'https://www.tkqlhce.com/click-101708885-10433860', cashback_rate: 2, commission_rate: 4 },
        { title: 'Hotels.com US Homepage — Book Any Hotel', description: 'Book any hotel in the US with deep-link access to Hotels.com.', affiliate_url: 'https://www.jdoqocy.com/click-101708885-15042852', cashback_rate: 2, commission_rate: 4 },
      ]
    );

    // Vrbo — 2% CJ commission, offering 1% cashback
    await seedMerchantsOffers(
      { name: 'Vrbo', description: 'Find unique vacation rentals and earn cash back on every booking.', website: 'https://www.vrbo.com', category: 'Travel' },
      [
        { title: 'Earn OneKeyCash on Hotels, Rentals, Flights & More', description: 'Earn OneKeyCash for every dollar spent on eligible hotels, vacation rentals, flights and more.', affiliate_url: 'https://www.dpbolvw.net/click-101708885-15583546', cashback_rate: 1, commission_rate: 2 },
        { title: 'Find Your Perfect Vacation Rental — Vrbo', description: 'Browse thousands of vacation rentals and find the perfect home away from home.', affiliate_url: 'https://www.jdoqocy.com/click-101708885-10784831', cashback_rate: 1, commission_rate: 2 },
        { title: 'List Your Vacation Property on Vrbo', description: 'Earn income by listing your vacation property on Vrbo. Join millions of hosts worldwide.', affiliate_url: 'https://www.anrdoezrs.net/click-101708885-10697642', cashback_rate: 1, commission_rate: 2 },
        { title: '7 Day Stays for Less — Weekly Discount', description: 'Get a discount by staying a full week. Save more with 7-day stay deals on Vrbo.', affiliate_url: 'https://www.anrdoezrs.net/click-101708885-14506917', cashback_rate: 1, commission_rate: 2 },
        { title: 'US Vacation Rentals Under $200 a Night', description: 'Find affordable vacation rentals across the United States for under $200 per night.', affiliate_url: 'https://www.anrdoezrs.net/click-101708885-15407788', cashback_rate: 1, commission_rate: 2 },
        { title: 'Hilton Head, SC Vacation Rentals', description: 'Find the best vacation rentals in Hilton Head, South Carolina on Vrbo.', affiliate_url: 'https://www.jdoqocy.com/click-101708885-13217353', cashback_rate: 1, commission_rate: 2 },
        { title: 'South Carolina Vacation Rentals', description: 'Find out what vacation rentals in South Carolina are available and renting for on Vrbo.', affiliate_url: 'https://www.kqzyfj.com/click-101708885-10790647', cashback_rate: 1, commission_rate: 2 },
      ]
    );

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
