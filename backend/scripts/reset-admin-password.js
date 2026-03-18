/**
 * Reset the default admin password.
 * Usage: node scripts/reset-admin-password.js <newpassword>
 * Example: node scripts/reset-admin-password.js MyNewSecurePass123!
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const newPassword = process.argv[2];

if (!newPassword) {
  console.error('Usage: node scripts/reset-admin-password.js <newpassword>');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false,
});

(async () => {
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE email = 'admin@cashback.com' RETURNING id, email",
      [hashed]
    );

    if (result.rowCount === 0) {
      console.error('Admin user not found.');
      process.exit(1);
    }

    console.log(`✓ Admin password updated for: ${result.rows[0].email}`);
    console.log('  You can now log in with your new password.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
