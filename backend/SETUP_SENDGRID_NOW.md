# SendGrid Setup - Quick Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create SendGrid Account

1. **Go to:** https://sendgrid.com/free/
2. **Click:** "Start for Free"
3. **Sign up** with your email
4. **Verify your email** (check inbox)

### Step 2: Verify Sender Identity

**Option A: Single Sender (Easiest for MVP)**

1. Go to: **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in the form:
   - **From Email:** `noreply@yourdomain.com` (or your email)
   - **From Name:** `CashBack Rewards`
   - **Reply To:** Your email
   - **Company Address:** Your address
4. Click **"Create"**
5. **Check your email** and click the verification link
6. ✅ **Sender verified!**

**Option B: Domain Authentication (Better for Production)**

1. Go to: **Settings** → **Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Select your DNS provider
4. Add DNS records as instructed
5. Wait for verification (can take a few hours)

### Step 3: Create API Key

1. Go to: **Settings** → **API Keys**
2. Click **"Create API Key"**
3. **Name:** `Cashback Rewards Production`
4. **Permissions:** Select **"Full Access"** (or just **"Mail Send"**)
5. Click **"Create & View"**
6. **⚠️ IMPORTANT:** Copy the API key immediately!
   - It looks like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **You won't see it again!**

### Step 4: Update Configuration

Edit `backend/.env.production` and replace:

```env
SMTP_PASS=your-sendgrid-api-key-here
```

With your actual API key:

```env
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Also update the sender email:

```env
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
```

Replace `noreply@yourdomain.com` with your verified sender email.

### Step 5: Test Configuration

```bash
cd backend
npm run validate:prod
```

Should show: ✅ SMTP configuration is correct

### Step 6: Test Email Sending

```bash
npm run test:email your-email@example.com
```

**Replace `your-email@example.com` with your actual email.**

---

## ✅ Done!

Your SendGrid email service is now configured!

**Benefits:**
- ✅ No recipient authorization needed (unlike Mailgun sandbox)
- ✅ Can send to any email address
- ✅ Free tier: 100 emails/day
- ✅ Simple API key authentication

---

## 📊 SendGrid Free Tier

- **100 emails/day** (free forever)
- **No credit card required**
- **Perfect for MVP!**

---

## 🆘 Troubleshooting

### "Authentication failed"

**Solution:**
- Check API key is correct
- Ensure API key has "Mail Send" permission
- Verify you're using the API key (starts with `SG.`)

### "Sender not verified"

**Solution:**
- Verify sender email in SendGrid dashboard
- Check email for verification link
- Wait a few minutes for verification to process

### "Connection timeout"

**Solution:**
- Check firewall allows port 587
- Try port 465 with `SMTP_SECURE=true`

---

## 📚 Next Steps

1. ✅ Get SendGrid API key
2. ✅ Update `.env.production`
3. ✅ Test email sending
4. ✅ Deploy to production

---

**Ready?** Follow the steps above to set up SendGrid! 🚀
