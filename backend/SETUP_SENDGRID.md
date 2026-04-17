# Quick Setup: SendGrid (Step-by-Step)

## 🚀 Fast Track Setup (5 Minutes)

### Step 1: Sign Up (1 min)

1. Go to: **https://sendgrid.com/free/**
2. Click **"Start for Free"**
3. Fill in:
   - Email
   - Password
   - Company (optional)
4. Verify your email

### Step 2: Verify Sender (2 min)

1. Go to: **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in:
   - **From Email:** `noreply@yourdomain.com` (or your email)
   - **From Name:** `CashBack Rewards`
   - **Reply To:** Your email
   - **Address:** Your address
4. Click **"Create"**
5. Check email and click **"Verify"**

### Step 3: Create API Key (1 min)

1. Go to: **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name: `Cashback Production`
4. Permissions: **"Full Access"** (or "Mail Send")
5. Click **"Create & View"**
6. **COPY THE KEY** (you won't see it again!)
   - Looks like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Configure App (1 min)

Update `backend/.env.production`:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
```

**Replace:**
- `SMTP_PASS` = Your copied API key
- `noreply@yourdomain.com` = Your verified sender email

### Step 5: Test (1 min)

```bash
cd backend
npm run validate:prod
```

Should show: ✅ SMTP configuration is correct

---

## ✅ Done!

Your email service is now configured!

**Next:** Test by registering a new user or deploying to production.

---

## 🆘 Quick Troubleshooting

**"Authentication failed"**
- Check API key is correct
- Ensure API key has "Mail Send" permission

**"Sender not verified"**
- Check email for verification link
- Verify sender in SendGrid dashboard

**"Connection timeout"**
- Check firewall allows port 587
- Try port 465 with `SMTP_SECURE=true`

---

**That's it!** 🎉
