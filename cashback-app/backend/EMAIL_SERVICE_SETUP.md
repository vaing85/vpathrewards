# Email Service Setup Guide

## 🎯 Recommendation: SendGrid

**Why SendGrid for MVP:**
- ✅ **Easiest setup** - Just need an API key
- ✅ **Free tier** - 100 emails/day (perfect for MVP)
- ✅ **No credit card required** for free tier
- ✅ **Great documentation** and support
- ✅ **Reliable delivery** rates
- ✅ **Simple integration** with our existing code

**Alternatives:**
- **Mailgun** - 5,000 emails/month free, but slightly more complex
- **AWS SES** - Very cheap, but requires AWS account setup
- **Gmail** - Not recommended for production

---

## 📧 Option 1: SendGrid Setup (Recommended)

### Step 1: Create SendGrid Account

1. Go to [https://sendgrid.com](https://sendgrid.com)
2. Click **"Start for Free"** or **"Sign Up"**
3. Fill in your details:
   - Email address
   - Password
   - Company name (optional)
4. Verify your email address
5. Complete the account setup

### Step 2: Verify Your Sender Identity

**Option A: Single Sender Verification (Easiest for MVP)**

1. Go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in the form:
   - **From Email:** `noreply@yourdomain.com` (or your email)
   - **From Name:** `CashBack Rewards`
   - **Reply To:** Your support email
   - **Company Address:** Your business address
4. Click **"Create"**
5. Check your email and click the verification link
6. ✅ Sender verified!

**Option B: Domain Authentication (Better for Production)**

1. Go to **Settings** → **Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Select your DNS provider
4. Follow the instructions to add DNS records
5. Wait for verification (can take a few hours)

### Step 3: Create API Key

1. Go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Give it a name: `Cashback Rewards Production`
4. Select permissions: **"Full Access"** (or just **"Mail Send"**)
5. Click **"Create & View"**
6. **⚠️ IMPORTANT:** Copy the API key immediately (you won't see it again!)
   - It looks like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Configure in Your App

Update `backend/.env.production`:

```env
# Email Configuration (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
```

**Replace:**
- `SMTP_PASS` with your actual SendGrid API key
- `noreply@yourdomain.com` with your verified sender email

### Step 5: Test Email Sending

You can test by:
1. Starting your server
2. Registering a new user (should send welcome email)
3. Or use the test script below

---

## 📧 Option 2: Mailgun Setup (Alternative)

### Step 1: Create Mailgun Account

1. Go to [https://www.mailgun.com](https://www.mailgun.com)
2. Click **"Sign Up"**
3. Create account and verify email

### Step 2: Verify Domain

1. Go to **Sending** → **Domains**
2. Click **"Add New Domain"**
3. Enter your domain
4. Add DNS records to your domain
5. Wait for verification

### Step 3: Get SMTP Credentials

1. Go to **Sending** → **Domain Settings**
2. Click on your verified domain
3. Go to **"SMTP credentials"** tab
4. Note your SMTP settings:
   - **SMTP Hostname:** `smtp.mailgun.org`
   - **Port:** `587`
   - **Username:** `postmaster@yourdomain.mailgun.org`
   - **Password:** (shown in dashboard)

### Step 4: Configure in Your App

Update `backend/.env.production`:

```env
# Email Configuration (Mailgun)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
```

---

## 📧 Option 3: AWS SES Setup (Advanced)

### Step 1: AWS Account Setup

1. Create AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Go to **SES (Simple Email Service)**
3. Verify your email address or domain

### Step 2: Create SMTP Credentials

1. Go to **SES** → **SMTP Settings**
2. Click **"Create SMTP Credentials"**
3. Create IAM user for SMTP
4. Download credentials (CSV file)

### Step 3: Configure in Your App

Update `backend/.env.production`:

```env
# Email Configuration (AWS SES)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Use your region
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-ses-smtp-username
SMTP_PASS=your-aws-ses-smtp-password
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
```

**Note:** AWS SES starts in "sandbox mode" - you can only send to verified emails. Request production access to send to any email.

---

## 🧪 Testing Email Configuration

### Option 1: Test via User Registration

1. Start your server:
   ```bash
   cd backend
   npm run dev
   ```

2. Register a new user via your frontend
3. Check if welcome email is received

### Option 2: Create Test Script

Create `backend/test-email.js`:

```javascript
require('dotenv').config({ path: '.env.production' });
const { sendEmailToUser } = require('./dist/utils/emailService');

async function testEmail() {
  try {
    console.log('📧 Testing email configuration...\n');
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP User:', process.env.SMTP_USER);
    console.log('SMTP From:', process.env.SMTP_FROM);
    console.log('\nSending test email...\n');

    // You'll need a test user ID - replace with actual user ID
    await sendEmailToUser(
      1, // User ID
      'test@example.com', // Your test email
      'welcome',
      {
        name: 'Test User',
        referralCode: 'TEST123'
      },
      'user'
    );

    console.log('✅ Test email sent! Check your inbox.');
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('\nTroubleshooting:');
    console.log('1. Check SMTP credentials in .env.production');
    console.log('2. Verify sender email/domain is verified');
    console.log('3. Check firewall allows SMTP port 587');
    console.log('4. Review error details above');
  }
}

testEmail();
```

Run test:
```bash
cd backend
npm run build
node test-email.js
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Email service account created
- [ ] Sender email/domain verified
- [ ] API key/SMTP credentials obtained
- [ ] `.env.production` updated with credentials
- [ ] Test email sent successfully
- [ ] Welcome email received on user registration
- [ ] Cashback confirmation emails work
- [ ] Withdrawal notification emails work

---

## 🐛 Troubleshooting

### Issue: "Authentication failed"

**Solutions:**
- Double-check SMTP credentials
- For SendGrid: Ensure API key has "Mail Send" permission
- For Mailgun: Verify domain is authenticated
- For AWS SES: Check SMTP credentials are correct

### Issue: "Connection timeout"

**Solutions:**
- Check firewall allows port 587
- Try port 465 with `SMTP_SECURE=true`
- Verify SMTP host is correct

### Issue: "Sender not verified"

**Solutions:**
- Verify sender email/domain in email service dashboard
- Check spam folder for verification email
- For domain: Ensure DNS records are correct

### Issue: "Rate limit exceeded"

**Solutions:**
- Check your email service tier limits
- Upgrade plan if needed
- Implement email queuing for high volume

---

## 📊 Email Service Comparison

| Feature | SendGrid | Mailgun | AWS SES |
|---------|----------|---------|---------|
| **Free Tier** | 100/day | 5,000/month | 62,000/month* |
| **Setup Difficulty** | ⭐ Easy | ⭐⭐ Medium | ⭐⭐⭐ Hard |
| **Cost (after free)** | $15/month | $35/month | Pay per email |
| **Best For** | MVP | Growing apps | Scale |
| **Verification** | Email or Domain | Domain | Email or Domain |

*AWS SES requires production access request

---

## 🎯 Recommendation Summary

**For MVP:** Use **SendGrid**
- Easiest setup
- Free tier sufficient
- Quick to get started

**For Growth:** Consider **Mailgun** or **AWS SES**
- Higher free tier limits
- Better for scale
- More cost-effective at volume

---

## 📚 Next Steps

After setting up email service:

1. ✅ Update `.env.production` with credentials
2. ✅ Run `npm run validate:prod` to verify
3. ✅ Test email sending
4. ✅ Deploy to production

---

**Need Help?** Check the email service provider's documentation or troubleshooting guide.


MailGun

zapearn@sandbox90c290041e2e4a4081ad7de499ba4c70.mailgun.org
8445014ea75f77707891a1da6904d03c-04af4ed8-b2155500
