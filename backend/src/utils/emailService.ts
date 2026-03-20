import nodemailer from 'nodemailer';
import { dbGet, dbAll } from '../database';
import { appConfig } from '../config/appConfig';

// Cache for Ethereal test account
let etherealAccount: nodemailer.TestAccount | null = null;

const createTransporter = async () => {
  if (appConfig.smtp.useEtherealInDev) {
    if (!etherealAccount) {
      etherealAccount = await nodemailer.createTestAccount();
      console.log('📧 Ethereal Email configured for development');
      console.log('   Test account created:', etherealAccount.user);
    }
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: etherealAccount.user, pass: etherealAccount.pass }
    });
  }
  return nodemailer.createTransport({
    host: appConfig.smtp.host,
    port: appConfig.smtp.port,
    secure: appConfig.smtp.secure,
    auth: {
      user: appConfig.smtp.user,
      pass: appConfig.smtp.pass
    }
  });
};

// Check if user wants to receive email notifications
const shouldSendEmail = async (userId: number, notificationType: 'email' | 'cashback' | 'withdrawal' | 'newOffers'): Promise<boolean> => {
  try {
    const user = await dbGet(
      'SELECT notification_email, notification_cashback, notification_withdrawal, notification_new_offers FROM users WHERE id = ?',
      [userId]
    ) as { notification_email: number; notification_cashback: number; notification_withdrawal: number; notification_new_offers: number } | undefined;

    if (!user) return false;

    // Always check general email notification preference
    if (user.notification_email === 0) return false;

    // Check specific notification type
    switch (notificationType) {
      case 'cashback':
        return user.notification_cashback === 1;
      case 'withdrawal':
        return user.notification_withdrawal === 1;
      case 'newOffers':
        return user.notification_new_offers === 1;
      case 'email':
        return user.notification_email === 1;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return false;
  }
};

// Email templates
const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to V PATHing Rewards! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to V PATHing Rewards!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name}! 👋</h2>
              <p>Thank you for joining V PATHing Rewards! We're excited to help you earn money back on your everyday purchases.</p>
              <p><strong>Here's what you can do:</strong></p>
              <ul>
                <li>Browse hundreds of merchants and exclusive offers</li>
                <li>Earn cashback on every purchase</li>
                <li>Track your earnings in real-time</li>
                <li>Withdraw your cashback when you're ready</li>
              </ul>
              <p style="text-align: center;">
                <a href="${appConfig.frontendUrl}" class="button">Start Earning Cashback</a>
              </p>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy shopping! 🛍️</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.</p>
              <p>You're receiving this email because you signed up for V PATHing Rewards.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to V PATHing Rewards!
      
      Hi ${name}!
      
      Thank you for joining V PATHing Rewards! We're excited to help you earn money back on your everyday purchases.
      
      Here's what you can do:
      - Browse hundreds of merchants and exclusive offers
      - Earn cashback on every purchase
      - Track your earnings in real-time
      - Withdraw your cashback when you're ready
      
      Start earning: ${appConfig.frontendUrl}
      
      If you have any questions, feel free to reach out to our support team.
      
      Happy shopping!
      
      © ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.
    `
  }),

  cashbackConfirmation: (name: string, amount: number, merchantName: string, offerTitle: string) => ({
    subject: `💰 Cashback Confirmed: $${amount.toFixed(2)} from ${merchantName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .amount { font-size: 36px; font-weight: bold; color: #11998e; text-align: center; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .button { display: inline-block; padding: 12px 30px; background: #11998e; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Cashback Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name}!</h2>
              <p>Great news! Your cashback has been confirmed.</p>
              <div class="amount">$${amount.toFixed(2)}</div>
              <div class="details">
                <div class="detail-row">
                  <strong>Merchant:</strong>
                  <span>${merchantName}</span>
                </div>
                <div class="detail-row">
                  <strong>Offer:</strong>
                  <span>${offerTitle}</span>
                </div>
                <div class="detail-row">
                  <strong>Status:</strong>
                  <span style="color: #11998e; font-weight: bold;">Confirmed</span>
                </div>
              </div>
              <p style="text-align: center;">
                <a href="${appConfig.frontendUrl}/dashboard" class="button">View Your Earnings</a>
              </p>
              <p>This cashback has been added to your account balance. You can withdraw it once you reach the minimum withdrawal amount.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Cashback Confirmed!
      
      Hi ${name}!
      
      Great news! Your cashback has been confirmed.
      
      Amount: $${amount.toFixed(2)}
      Merchant: ${merchantName}
      Offer: ${offerTitle}
      Status: Confirmed
      
      This cashback has been added to your account balance. You can withdraw it once you reach the minimum withdrawal amount.
      
      View your earnings: ${appConfig.frontendUrl}/dashboard
      
      © ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.
    `
  }),

  newOfferAlert: (name: string, offerTitle: string, merchantName: string, cashbackRate: number, offerId: number) => ({
    subject: `🎉 New Offer: ${cashbackRate}% Cashback at ${merchantName}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .offer-box { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f5576c; }
            .cashback-badge { display: inline-block; background: #f5576c; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 18px; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New Offer Available!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name}!</h2>
              <p>Great news! We just added a new cashback offer that might interest you.</p>
              
              <div class="offer-box">
                <h3 style="margin-top: 0; color: #333;">${merchantName}</h3>
                <p style="font-size: 16px; color: #666; margin: 10px 0;">${offerTitle}</p>
                <div class="cashback-badge">${cashbackRate}% Cashback</div>
              </div>
              
              <p style="text-align: center;">
                <a href="${appConfig.frontendUrl}/offers/${offerId}" class="button">View Offer</a>
              </p>
              
              <p>Don't miss out on this great deal! Shop now and earn cashback on your purchase.</p>
              <p>Happy shopping! 🛍️</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.</p>
              <p><a href="${appConfig.frontendUrl}/profile" style="color: #666;">Manage your notification preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      New Offer Available!
      
      Hi ${name}!
      
      Great news! We just added a new cashback offer that might interest you.
      
      ${merchantName}
      ${offerTitle}
      ${cashbackRate}% Cashback
      
      View offer: ${appConfig.frontendUrl}/offers/${offerId}
      
      Don't miss out on this great deal! Shop now and earn cashback on your purchase.
      
      Happy shopping!
      
      © ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.
      Manage your notification preferences: ${appConfig.frontendUrl}/profile
    `
  }),

  withdrawalStatus: (name: string, amount: number, status: string, adminNotes?: string) => {
    const statusMessages: Record<string, { title: string; message: string; color: string }> = {
      pending: {
        title: 'Withdrawal Request Received 📧',
        message: 'Your withdrawal request has been received and is under review. We will process it as soon as possible.',
        color: '#667eea'
      },
      approved: {
        title: 'Withdrawal Approved ✅',
        message: 'Your withdrawal request has been approved and is being processed.',
        color: '#11998e'
      },
      processing: {
        title: 'Withdrawal Processing ⏳',
        message: 'Your withdrawal is currently being processed.',
        color: '#f39c12'
      },
      completed: {
        title: 'Withdrawal Completed 🎉',
        message: 'Your withdrawal has been completed and the funds have been sent.',
        color: '#27ae60'
      },
      rejected: {
        title: 'Withdrawal Rejected ❌',
        message: 'Your withdrawal request has been rejected.',
        color: '#e74c3c'
      }
    };

    const statusInfo = statusMessages[status] || {
      title: 'Withdrawal Update',
      message: `Your withdrawal status has been updated to: ${status}`,
      color: '#667eea'
    };

    return {
      subject: `${statusInfo.title}: $${amount.toFixed(2)}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .amount { font-size: 36px; font-weight: bold; color: ${statusInfo.color}; text-align: center; margin: 20px 0; }
              .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .detail-row:last-child { border-bottom: none; }
              .notes { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .button { display: inline-block; padding: 12px 30px; background: ${statusInfo.color}; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${statusInfo.title}</h1>
              </div>
              <div class="content">
                <h2>Hi ${name}!</h2>
                <p>${statusInfo.message}</p>
                <div class="amount">$${amount.toFixed(2)}</div>
                <div class="details">
                  <div class="detail-row">
                    <strong>Amount:</strong>
                    <span>$${amount.toFixed(2)}</span>
                  </div>
                  <div class="detail-row">
                    <strong>Status:</strong>
                    <span style="color: ${statusInfo.color}; font-weight: bold;">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  </div>
                </div>
                ${adminNotes ? `
                  <div class="notes">
                    <strong>Admin Notes:</strong>
                    <p>${adminNotes}</p>
                  </div>
                ` : ''}
                <p style="text-align: center;">
                  <a href="${appConfig.frontendUrl}/withdrawals" class="button">View Withdrawal Details</a>
                </p>
                ${status === 'rejected' ? '<p>If you have any questions about this rejection, please contact our support team.</p>' : ''}
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        ${statusInfo.title}
        
        Hi ${name}!
        
        ${statusInfo.message}
        
        Amount: $${amount.toFixed(2)}
        Status: ${status.charAt(0).toUpperCase() + status.slice(1)}
        ${adminNotes ? `\nAdmin Notes: ${adminNotes}` : ''}
        
        View withdrawal details: ${appConfig.frontendUrl}/withdrawals
        
        ${status === 'rejected' ? '\nIf you have any questions about this rejection, please contact our support team.' : ''}
        
        © ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.
      `
    };
  },

  passwordReset: (name: string, resetUrl: string) => ({
    subject: 'Reset your V PATHing Rewards password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 14px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .note { font-size: 13px; color: #888; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Password Reset Request</h1></div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>We received a request to reset the password for your V PATHing Rewards account.</p>
              <p style="text-align:center;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </p>
              <p class="note">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${name},\n\nReset your password here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\n© ${new Date().getFullYear()} V PATHing Rewards`
  }),
};

// Send email function
export const sendEmail = async (
  to: string,
  template: 'welcome' | 'cashbackConfirmation' | 'withdrawalStatus' | 'newOfferAlert' | 'passwordReset',
  data: any
): Promise<boolean> => {
  try {
    if (!appConfig.smtp.configured && appConfig.isProduction) {
      console.warn('SMTP not configured. Email not sent.');
      return false;
    }

    const transporter = await createTransporter();
    let emailContent;

    switch (template) {
      case 'welcome':
        emailContent = emailTemplates.welcome(data.name);
        break;
      case 'cashbackConfirmation':
        emailContent = emailTemplates.cashbackConfirmation(
          data.name,
          data.amount,
          data.merchantName,
          data.offerTitle
        );
        break;
      case 'withdrawalStatus':
        emailContent = emailTemplates.withdrawalStatus(
          data.name,
          data.amount,
          data.status,
          data.adminNotes
        );
        break;
      case 'newOfferAlert':
        emailContent = emailTemplates.newOfferAlert(
          data.name,
          data.offerTitle,
          data.merchantName,
          data.cashbackRate,
          data.offerId
        );
        break;
      case 'passwordReset':
        emailContent = emailTemplates.passwordReset(data.name, data.resetUrl);
        break;
      default:
        throw new Error('Invalid email template');
    }

    const mailOptions = {
      from: appConfig.smtp.from || `"V PATHing Rewards" <${appConfig.smtp.user}>`,
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (appConfig.smtp.useEtherealInDev) {
      // Ethereal Email - show preview URL
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('📧 Email sent via Ethereal Email');
      console.log('   Preview URL:', previewUrl);
      console.log('   To:', to);
      console.log('   Subject:', emailContent.subject);
    } else {
      console.log('📧 Email sent successfully:', info.messageId);
      console.log('   To:', to);
      console.log('   Subject:', emailContent.subject);
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send email with user preference check
export const sendEmailToUser = async (
  userId: number,
  userEmail: string,
  template: 'welcome' | 'cashbackConfirmation' | 'withdrawalStatus' | 'newOfferAlert',
  data: any,
  notificationType: 'email' | 'cashback' | 'withdrawal' | 'newOffers' = 'email'
): Promise<boolean> => {
  // Check user preferences
  const shouldSend = await shouldSendEmail(userId, notificationType);
  
  if (!shouldSend) {
    console.log(`Email not sent to user ${userId}: notification preference disabled`);
    return false;
  }

  return await sendEmail(userEmail, template, data);
};

// Send new offer alert to all users who opted in
export const sendNewOfferAlerts = async (
  offerId: number,
  offerTitle: string,
  merchantName: string,
  cashbackRate: number
): Promise<{ sent: number; failed: number }> => {
  try {
    // Get all users who opted in for new offer alerts
    const users = await dbAll(
      'SELECT id, email, name FROM users WHERE notification_email = 1 AND notification_new_offers = 1 AND is_admin = 0',
      []
    ) as { id: number; email: string; name: string }[];

    let sent = 0;
    let failed = 0;

    // Send emails asynchronously (don't wait for all)
    const emailPromises = users.map(async (user) => {
      try {
        const success = await sendEmailToUser(
          user.id,
          user.email,
          'newOfferAlert',
          {
            name: user.name,
            offerTitle,
            merchantName,
            cashbackRate,
            offerId
          },
          'newOffers'
        );
        if (success) sent++;
        else failed++;
      } catch (error) {
        console.error(`Failed to send new offer alert to ${user.email}:`, error);
        failed++;
      }
    });

    await Promise.allSettled(emailPromises);

    console.log(`New offer alerts sent: ${sent} successful, ${failed} failed`);
    return { sent, failed };
  } catch (error) {
    console.error('Error sending new offer alerts:', error);
    return { sent: 0, failed: 0 };
  }
};
