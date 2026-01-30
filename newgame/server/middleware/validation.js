/**
 * Input Validation Middleware
 * 
 * Validates and sanitizes request inputs to prevent injection attacks
 * and ensure data integrity
 */

/**
 * Validate bet amount
 * @param {number} bet - Bet amount
 * @param {number} minBet - Minimum bet (default: 5)
 * @param {number} maxBet - Maximum bet (default: 1000)
 * @returns {object} - { valid: boolean, error?: string }
 */
const validateBet = (bet, minBet = 5, maxBet = 1000) => {
  if (bet === undefined || bet === null) {
    return { valid: false, error: 'Bet amount is required' };
  }

  const betNum = Number(bet);
  
  if (isNaN(betNum)) {
    return { valid: false, error: 'Bet amount must be a number' };
  }

  if (betNum <= 0) {
    return { valid: false, error: 'Bet amount must be greater than 0' };
  }

  if (betNum < minBet) {
    return { valid: false, error: `Minimum bet is $${minBet}` };
  }

  if (betNum > maxBet) {
    return { valid: false, error: `Maximum bet is $${maxBet}` };
  }

  if (!Number.isInteger(betNum) && betNum % 1 !== 0) {
    return { valid: false, error: 'Bet amount must be a whole number' };
  }

  return { valid: true, value: betNum };
};

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {object} - { valid: boolean, error?: string }
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true, value: email.trim().toLowerCase() };
};

/**
 * Validate password
 * @param {string} password - Password
 * @returns {object} - { valid: boolean, error?: string }
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long' };
  }

  return { valid: true, value: password };
};

/**
 * Validate username
 * @param {string} username - Username
 * @returns {object} - { valid: boolean, error?: string }
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { valid: true, value: trimmed };
};

/**
 * Validate amount (for deposits/withdrawals)
 * @param {number} amount - Amount
 * @param {number} minAmount - Minimum amount (default: 1)
 * @param {number} maxAmount - Maximum amount (default: 10000)
 * @returns {object} - { valid: boolean, error?: string }
 */
const validateAmount = (amount, minAmount = 1, maxAmount = 10000) => {
  if (amount === undefined || amount === null) {
    return { valid: false, error: 'Amount is required' };
  }

  const amountNum = Number(amount);
  
  if (isNaN(amountNum)) {
    return { valid: false, error: 'Amount must be a number' };
  }

  if (amountNum <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (amountNum < minAmount) {
    return { valid: false, error: `Minimum amount is $${minAmount}` };
  }

  if (amountNum > maxAmount) {
    return { valid: false, error: `Maximum amount is $${maxAmount}` };
  }

  // Allow up to 2 decimal places
  if (amountNum % 0.01 !== 0) {
    return { valid: false, error: 'Amount can only have up to 2 decimal places' };
  }

  return { valid: true, value: parseFloat(amountNum.toFixed(2)) };
};

/**
 * Sanitize string input
 * @param {string} input - Input string
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

/**
 * Middleware to validate bet in request body
 */
const validateBetMiddleware = (req, res, next) => {
  const validation = validateBet(req.body.bet);
  
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  req.body.bet = validation.value;
  next();
};

/**
 * Middleware to validate amount in request body
 */
const validateAmountMiddleware = (req, res, next) => {
  const validation = validateAmount(req.body.amount);
  
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  req.body.amount = validation.value;
  next();
};

module.exports = {
  validateBet,
  validateEmail,
  validatePassword,
  validateUsername,
  validateAmount,
  sanitizeString,
  validateBetMiddleware,
  validateAmountMiddleware
};

