# Test Email Configuration - Instructions

## 🧪 Quick Test

### Step 1: Run the Test

```bash
cd backend
npm run test:email your-email@example.com
```

**Replace `your-email@example.com` with your actual email address.**

### Step 2: Check Results

The script will:
1. ✅ Verify SMTP connection
2. ✅ Send a test email
3. ✅ Show success/error messages

### Step 3: Check Your Email

- Check your **inbox**
- Check your **spam folder**
- Check **Mailgun logs** (if using Mailgun)

---

## ⚠️ Important: Mailgun Sandbox

If you're using a **Mailgun sandbox domain**, you must:

1. **Add your email to authorized recipients:**
   - Go to: https://app.mailgun.com/
   - Click on your sandbox domain
   - Go to **"Sending"** → **"Authorized Recipients"**
   - Click **"Add Recipient"**
   - Enter your email address
   - Click **"Save"**

2. **Then run the test:**
   ```bash
   npm run test:email your-email@example.com
   ```

---

## 📋 Test Options

### Option 1: Command Line Argument
```bash
npm run test:email your-email@example.com
```

### Option 2: Environment Variable
Add to `.env.production`:
```env
TEST_EMAIL=your-email@example.com
```

Then run:
```bash
npm run test:email
```

---

## ✅ Expected Output

**Success:**
```
📧 Testing Email Configuration...

Configuration:
  SMTP Host: smtp.mailgun.org
  SMTP User: zapearn@sandbox90c290041e2e4a4081ad7de499ba4c70.mailgun.org...
  SMTP Pass: SET (hidden)
  From: zapearn@sandbox90c290041e2e4a4081ad7de499ba4c70.mailgun.org

📤 Sending test email to: your-email@example.com

🔍 Verifying SMTP connection...
✅ SMTP connection verified!

📧 Sending test email...

✅ Test email sent successfully!

Email Details:
  Message ID: <...>
  Response: 250 OK

🎉 Email configuration test complete!
```

---

## 🐛 Troubleshooting

### Error: "Authentication failed"

**Solution:**
- Check SMTP credentials in `.env.production`
- Verify credentials in Mailgun dashboard
- Ensure you're using SMTP credentials, not API key

### Error: "Recipient not authorized" (550)

**Solution:**
- Add recipient to authorized list in Mailgun
- Or verify your own domain in Mailgun

### Error: "Connection timeout"

**Solution:**
- Check firewall allows port 587
- Try port 465 with `SMTP_SECURE=true`

### Email not received

**Check:**
1. Spam folder
2. Mailgun logs: Dashboard → Sending → Logs
3. Recipient is authorized (if using sandbox)

---

## 📊 Check Mailgun Logs

1. Go to: https://app.mailgun.com/
2. Click on your domain
3. Go to **"Sending"** → **"Logs"**
4. See delivery status:
   - ✅ **Delivered** - Email was sent successfully
   - ⚠️ **Failed** - Check error message
   - 📤 **Accepted** - Email accepted by Mailgun

---

## ✅ Success Checklist

- [ ] Test script runs without errors
- [ ] SMTP connection verified
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] Mailgun logs show "Delivered"

---

**Ready to test?** Run: `npm run test:email your-email@example.com`
