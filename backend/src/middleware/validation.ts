import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to check validation results
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules for authentication
export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('referral_code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Referral code must be less than 50 characters'),
  validate
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

// Validation rules for profile updates
export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  validate
];

export const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validate
];

// Validation rules for withdrawal requests
export const validateWithdrawal = [
  body('amount')
    .isFloat({ min: 10.0 })
    .withMessage('Amount must be at least $10.00'),
  body('payment_method')
    .trim()
    .isIn(['paypal', 'bank_transfer', 'venmo', 'zelle'])
    .withMessage('Invalid payment method'),
  body('payment_details')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Payment details must be between 3 and 200 characters'),
  validate
];

// Validation rules for cashback tracking
export const validateCashbackTrack = [
  body('offer_id')
    .isInt({ min: 1 })
    .withMessage('Valid offer ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  validate
];

// Validation rules for admin operations
export const validateMerchant = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Merchant name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters'),
  body('website_url')
    .optional()
    .isURL()
    .withMessage('Website URL must be a valid URL'),
  body('logo_url')
    .optional()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),
  validate
];

export const validateOffer = [
  body('merchant_id')
    .isInt({ min: 1 })
    .withMessage('Valid merchant ID is required'),
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('cashback_rate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Cashback rate must be between 0 and 100'),
  body('affiliate_link')
    .isURL()
    .withMessage('Affiliate link must be a valid URL'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  validate
];

// Validation for ID parameters
export const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid ID parameter'),
  validate
];

// Validation for merchant review (Phase 4)
export const validateMerchantReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Comment must be less than 2000 characters'),
  validate
];

// Validation for query parameters
export const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query must be less than 200 characters'),
  query('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters'),
  query('minCashback')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Minimum cashback must be between 0 and 100'),
  query('maxCashback')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Maximum cashback must be between 0 and 100'),
  validate
];
