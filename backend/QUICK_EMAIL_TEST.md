# 🧪 Quick Email Test

## ⚠️ Important First Step: Authorize Your Email

Since you're using a **Mailgun sandbox domain**, you must authorize your email first:

### Step 1: Add Authorized Recipient (2 minutes)

1. **Go to Mailgun Dashboard:**
   - https://app.mailgun.com/
   - Log in to your account

2. **Navigate to Authorized Recipients:**
   - Click on your sandbox domain: `sandbox90c290041e2e4a4081ad7de499ba4c70.mailgun.org`
   - Go to **"Sending"** tab
   - Click **"Authorized Recipients"**

3. **Add Your Email:**
   - Click **"Add Recipient"** button
   - Enter your email address (the one you want to test with)
   - Click **"Save"**

✅ **Done!** Your email is now authorized.

---

## 🚀 Step 2: Run the Test

Once your email is authorized, run:

```bash
cd backend
npm run test:email your-email@example.com
```

**Replace `your-email@example.com` with the email you just authorized.**

---

## ✅ What to Expect

**Success Output:**
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

## 📧 Step 3: Check Your Email

1. **Check your inbox**
2. **Check spam folder**
3. **Check Mailgun logs:**
   - Dashboard → **"Sending"** → **"Logs"**
   - Look for your test email
   - Status should show **"Delivered"**

---

## 🐛 If Test Fails

### Error: "Recipient not authorized" (550)

**Solution:** Make sure you added the email to authorized recipients (Step 1 above)

### Error: "Authentication failed"

**Solution:** 
- Check credentials in `.env.production`
- Verify in Mailgun dashboard

### Email not received

**Check:**
- Spam folder
- Mailgun logs for delivery status
- Email is authorized (if using sandbox)

---

## ✅ Success Checklist

- [ ] Email added to authorized recipients in Mailgun
- [ ] Test script runs without errors
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] Mailgun logs show "Delivered"

---

**Ready?** 

1. First: Authorize your email in Mailgun
2. Then: Run `npm run test:email your-email@example.com`
