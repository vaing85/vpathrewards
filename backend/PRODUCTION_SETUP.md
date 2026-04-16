# Production Setup Guide

This guide will help you configure the Cashback Rewards app for production deployment.

---

## 📋 Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] Domain name registered
- [ ] Hosting provider selected (VPS, PaaS, etc.)
- [ ] SSL certificate ready (Let's Encrypt recommended)
- [ ] Email service account (SendGrid, AWS SES, Mailgun)
- [ ] Database backup strategy planned

---

## 🔧 Step 1: Generate Secure JWT Secret

**IMPORTANT:** Never use the development JWT secret in production!

### Option A: Using the provided script
```bash
cd backend
node generate-jwt-secret.js
```

### Option B: Using OpenSSL
```bash
openssl rand -base64 32
```

### Option C: Using Node.js directly
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Copy the generated secret** - you'll need it for Step 3.

---

## 📧 Step 2: Set Up Email Service

Choose one email service provider:

### Option 1: SendGrid (Recommended - Easy Setup)

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API Key:
   - Go to Settings → API Keys
   - Create API Key with "Mail Send" permissions
   - Copy the API key
3. Verify your sender email/domain
4. Configure in `.env`:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key-here
   SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
   ```

### Option 2: AWS SES

1. Set up AWS SES in your AWS account
2. Verify your email/domain
3. Create SMTP credentials
4. Configure in `.env`:
   ```env
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-aws-ses-smtp-username
   SMTP_PASS=your-aws-ses-smtp-password
   SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
   ```

### Option 3: Mailgun

1. Sign up at [Mailgun](https://www.mailgun.com/)
2. Verify your domain
3. Get SMTP credentials
4. Configure in `.env`:
   ```env
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=postmaster@yourdomain.mailgun.org
   SMTP_PASS=your-mailgun-password
   SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
   ```

---

## 🔐 Step 3: Configure Production Environment

### 3.1 Create Production .env File

**On your production server:**

```bash
cd backend
cp .env.production .env
```

### 3.2 Update Environment Variables

Edit `.env` and update these values:

```env
# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Security (use the secret from Step 1)
JWT_SECRET=your-generated-secret-here

# Email (use settings from Step 2)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-email-service-api-key
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE=logs/app.log
```

### 3.3 Secure the .env File

```bash
# Set proper permissions (Linux/Mac)
chmod 600 .env

# Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

---

## 🗄️ Step 4: Database Configuration

### Option A: Keep SQLite (Simple for MVP)

SQLite works fine for MVP and small deployments. No additional configuration needed.

**Pros:**
- ✅ No setup required
- ✅ No separate database server
- ✅ Good for MVP/small scale

**Cons:**
- ❌ Not ideal for high concurrency
- ❌ No built-in replication

### Option B: PostgreSQL (Recommended for Scale)

1. Install PostgreSQL on your server
2. Create database and user:
   ```sql
   CREATE DATABASE cashback_db;
   CREATE USER cashback_user WITH PASSWORD 'secure-password';
   GRANT ALL PRIVILEGES ON DATABASE cashback_db TO cashback_user;
   ```
3. Update `.env`:
   ```env
   DATABASE_URL=postgresql://cashback_user:secure-password@localhost:5432/cashback_db
   ```
4. **Note:** You'll need to update `database.ts` to use PostgreSQL instead of SQLite.

---

## 🚀 Step 5: Build and Deploy

### 5.1 Build Backend

```bash
cd backend
npm install --production
npm run build
```

### 5.2 Build Frontend

```bash
cd frontend
npm install --production
npm run build
```

### 5.3 Start Backend Server

**Option A: Direct Node.js**
```bash
cd backend
NODE_ENV=production node dist/server.js
```

**Option B: PM2 (Recommended)**
```bash
npm install -g pm2
cd backend
pm2 start dist/server.js --name cashback-api
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

**Option C: Docker**
```bash
# Create Dockerfile (if not exists)
docker build -t cashback-api .
docker run -d -p 3001:3001 --env-file .env cashback-api
```

---

## 🔒 Step 6: Security Hardening

### 6.1 Update Rate Limits (if needed)

Rate limits are already configured, but you can adjust in `src/middleware/rateLimiter.ts`:

- **API Limiter:** 100 requests per 15 minutes (production)
- **Auth Limiter:** 5 requests per 15 minutes (production)
- **Admin Limiter:** 50 requests per 15 minutes

### 6.2 Review CORS Settings

CORS is configured in `src/server.ts`. Ensure `FRONTEND_URL` matches your production domain.

### 6.3 Enable HTTPS

**Use a reverse proxy (Nginx recommended):**

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### 6.4 Change Default Admin Password

1. Log in as admin
2. Go to Profile → Change Password
3. Set a strong password

---

## 📊 Step 7: Monitoring & Logging

### 7.1 Check Logs

Logs are written to `backend/logs/app.log` when `LOG_TO_FILE=true`.

```bash
# View logs
tail -f backend/logs/app.log

# Or with PM2
pm2 logs cashback-api
```

### 7.2 Set Up Monitoring (Optional)

**Option A: PM2 Monitoring**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Option B: External Monitoring**
- Set up UptimeRobot, Pingdom, or similar
- Monitor `/api/health` endpoint

---

## ✅ Step 8: Verify Deployment

### 8.1 Test Health Endpoint

```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{"status":"ok","message":"Cashback API is running"}
```

### 8.2 Test Critical Flows

1. **User Registration**
   - Register a new user
   - Check email (should receive welcome email)

2. **Login**
   - Login with credentials
   - Verify JWT token is returned

3. **Cashback Tracking**
   - Click an offer
   - Track a cashback transaction

4. **Admin Dashboard**
   - Login as admin
   - Access dashboard

### 8.3 Test Email Service

Send a test email:
```bash
# Use your API to trigger a test email
# Or check logs for email sending
```

---

## 🐛 Troubleshooting

### Issue: Server won't start

**Check:**
- Environment variables are set correctly
- Port 3001 is not in use
- Database is accessible
- All dependencies installed

### Issue: Emails not sending

**Check:**
- SMTP credentials are correct
- Email service account is verified
- Firewall allows SMTP ports (587, 465)
- Check logs for email errors

### Issue: CORS errors

**Check:**
- `FRONTEND_URL` matches your frontend domain
- CORS settings in `server.ts`
- Browser console for specific error

### Issue: Rate limit errors

**Check:**
- Rate limit settings in `rateLimiter.ts`
- Adjust limits if needed for your use case

---

## 📚 Additional Resources

- [Deployment Guide](../DEPLOYMENT_GUIDE.md) - Detailed deployment options
- [Security Guide](SECURITY_GUIDE.md) - Security best practices
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions

---

## 🎉 Next Steps

After production setup:

1. ✅ Monitor logs regularly
2. ✅ Set up automated backups
3. ✅ Monitor performance
4. ✅ Keep dependencies updated
5. ✅ Review security regularly

---

**Need Help?** Check the troubleshooting guide or review the error logs.
