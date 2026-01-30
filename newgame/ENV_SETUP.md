# Environment Variables Setup Guide

This guide explains how to set up environment variables for the casino game platform.

## Server Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

```env
# MongoDB Connection
# For local development: mongodb://localhost:27017/casino
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/casino
MONGODB_URI=mongodb://localhost:27017/casino

# Server Port
PORT=5000

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
# Generate strong random strings for production
# You can use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production

# Node Environment
NODE_ENV=development
```

## Client Environment Variables

Create a `.env` file in the `client/` directory with the following variables:

```env
# API URL
# For local development: http://localhost:5000/api
# For production: https://your-api-domain.com/api
REACT_APP_API_URL=http://localhost:5000/api
```

## Important Notes

1. **Never commit `.env` files to version control** - They are already in `.gitignore`
2. **Use `.env.example` files** - These are safe to commit and serve as templates
3. **Production Secrets** - Always use strong, randomly generated secrets in production
4. **MongoDB Atlas** - If using MongoDB Atlas, replace `MONGODB_URI` with your connection string
5. **React Environment Variables** - Must be prefixed with `REACT_APP_` to be accessible in the client

## Generating Secure Secrets

To generate secure JWT secrets, run:

```bash
# PowerShell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Or use an online generator, but ensure it's from a trusted source.

## Default Values

If environment variables are not set, the application will use these defaults:

- **Server Port**: 5000
- **MongoDB URI**: mongodb://localhost:27017/casino
- **Client API URL**: http://localhost:5000/api
- **JWT Secrets**: 'your-secret-key-change-this-in-production' (⚠️ NOT SECURE - Change in production!)

## Setup Steps

1. Copy the example content above into `.env` files in both `server/` and `client/` directories
2. Update the values according to your environment
3. For production, generate secure secrets and update all values
4. Restart your servers after making changes

