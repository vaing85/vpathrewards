// This file is kept for backward compatibility
// New session management is in middleware/session.js
const { auth, adminAuth } = require('./session');

module.exports = { auth, adminAuth };

