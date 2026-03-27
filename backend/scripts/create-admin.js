/**
 * Create the initial admin user.
 * Usage: node scripts/create-admin.js <email> <password> [name]
 * Example: node scripts/create-admin.js admin@example.com MySecurePass123! "Admin User"
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const [email, password, name = 'Admin'] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.js <email> <password> [name]');
  process.exit(1);
}

if (password.length < 12) {
  console.error('Admin password must be at least 12 characters.');
  process.exit(1);
}

if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(password)) {
  console.error('Admin password must contain uppercase, lowercase, a number, and a special character.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false,
});

(async () => {
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      console.error(`User with email ${email} already exists.`);
      process.exit(1);
    }

    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, password, name, is_admin) VALUES ($1, $2, $3, 1) RETURNING id, email',
      [email, hashed, name]
    );
    const adminId = result.rows[0].id;

    await pool.query(
      'INSERT INTO user_referral_codes (user_id, referral_code) VALUES ($1, $2)',
      [adminId, `ADMIN${adminId}`]
    );

    console.log(`Admin user created: ${result.rows[0].email} (id: ${adminId})`);
    console.log('Store your password securely — it cannot be recovered.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
