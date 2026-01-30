/**
 * Email Configuration Test Script
 * 
 * Run: node test-email.js
 * 
 * This script tests your Mailgun email configuration by sending a test email.
 */

require('dotenv').config({ path: '.env.production' });
const nodemailer = require('nodemailer');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEmail() {
  log('\n📧 Testing Email Configuration...\n', 'blue');
  
  // Check configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  
  console.log('Configuration:');
  console.log(`  SMTP Host: ${smtpHost || 'NOT SET'}`);
  console.log(`  SMTP User: ${smtpUser ? smtpUser.substring(0, 40) + '...' : 'NOT SET'}`);
  console.log(`  SMTP Pass: ${smtpPass ? 'SET (hidden)' : 'NOT SET'}`);
  console.log(`  From: ${smtpFrom || 'NOT SET'}`);
  console.log('');

  // Validate configuration
  if (!smtpHost || !smtpUser || !smtpPass) {
    log('❌ Error: Email configuration is incomplete!', 'red');
    console.log('\nPlease check your .env.production file:');
    console.log('  - SMTP_HOST');
    console.log('  - SMTP_USER');
    console.log('  - SMTP_PASS');
    process.exit(1);
  }

  // Get test email from command line or use default
  const testEmail = process.argv[2] || process.env.TEST_EMAIL;
  
  if (!testEmail) {
    log('⚠️  No test email provided!', 'yellow');
    console.log('\nUsage: node test-email.js your-email@example.com');
    console.log('Or set TEST_EMAIL in .env.production\n');
    console.log('Note: If using Mailgun sandbox, the email must be authorized in Mailgun dashboard.');
    console.log('      Go to: Mailgun Dashboard → Your Domain → Sending → Authorized Recipients\n');
    process.exit(1);
  }

  log(`📤 Sending test email to: ${testEmail}\n`, 'blue');

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    // Verify connection
    log('🔍 Verifying SMTP connection...', 'blue');
    await transporter.verify();
    log('✅ SMTP connection verified!\n', 'green');

    // Send test email
    log('📧 Sending test email...', 'blue');
    
    const mailOptions = {
      from: smtpFrom,
      to: testEmail,
      subject: '✅ Cashback Rewards - Email Test',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Email Configuration Test</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>✅ Success!</strong> Your email service is configured correctly!
              </div>
              
              <h2>Test Details</h2>
              <p><strong>SMTP Host:</strong> ${smtpHost}</p>
              <p><strong>From Address:</strong> ${smtpFrom}</p>
              <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
              
              <div class="info">
                <strong>ℹ️ What this means:</strong><br>
                Your Cashback Rewards app can now send emails including:
                <ul>
                  <li>Welcome emails (user registration)</li>
                  <li>Cashback confirmations</li>
                  <li>Withdrawal notifications</li>
                  <li>New offer alerts</li>
                </ul>
              </div>
              
              <p>If you received this email, your email configuration is working perfectly! 🎉</p>
            </div>
            <div class="footer">
              <p>CashBack Rewards - Email Service Test</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Cashback Rewards - Email Test

✅ Success! Your email service is configured correctly!

Test Details:
- SMTP Host: ${smtpHost}
- From Address: ${smtpFrom}
- Test Time: ${new Date().toLocaleString()}

What this means:
Your Cashback Rewards app can now send emails including:
- Welcome emails (user registration)
- Cashback confirmations
- Withdrawal notifications
- New offer alerts

If you received this email, your email configuration is working perfectly! 🎉
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    log('\n✅ Test email sent successfully!', 'green');
    console.log('\nEmail Details:');
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`  Response: ${info.response}`);
    
    // For Mailgun, show additional info
    if (smtpHost.includes('mailgun')) {
      console.log('\n📊 Next Steps:');
      console.log('  1. Check your inbox (and spam folder)');
      console.log('  2. Check Mailgun logs: https://app.mailgun.com/ → Sending → Logs');
      console.log('  3. If using sandbox, ensure recipient is authorized');
    }
    
    log('\n🎉 Email configuration test complete!', 'green');
    console.log('');
    
  } catch (error) {
    log('\n❌ Error sending test email:', 'red');
    console.error(error.message);
    console.error('');
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      log('🔐 Authentication Error:', 'yellow');
      console.log('  - Check SMTP_USER and SMTP_PASS in .env.production');
      console.log('  - Verify credentials in Mailgun dashboard');
      console.log('  - Ensure you\'re using SMTP credentials, not API key');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      log('🔌 Connection Error:', 'yellow');
      console.log('  - Check SMTP_HOST is correct (smtp.mailgun.org)');
      console.log('  - Check firewall allows port 587');
      console.log('  - Try port 465 with SMTP_SECURE=true');
    } else if (error.responseCode === 535) {
      log('🔐 Authentication Failed:', 'yellow');
      console.log('  - Invalid SMTP credentials');
      console.log('  - Check username and password in Mailgun dashboard');
    } else if (error.responseCode === 550) {
      log('📧 Recipient Error:', 'yellow');
      console.log('  - If using Mailgun sandbox, recipient must be authorized');
      console.log('  - Go to: Mailgun Dashboard → Your Domain → Sending → Authorized Recipients');
      console.log('  - Add the recipient email address');
    } else {
      log('❌ Unknown Error:', 'yellow');
      console.log('  - Check error details above');
      console.log('  - Verify all SMTP settings in .env.production');
    }
    
    console.log('\nFor more help, see: backend/EMAIL_SERVICE_SETUP.md');
    console.log('');
    process.exit(1);
  }
}

// Run test
testEmail();
