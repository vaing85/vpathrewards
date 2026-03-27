import { Resend } from 'resend';
import { dbGet, dbAll } from '../database';
import { appConfig } from '../config/appConfig';

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// From address — use verified domain in prod, Resend sandbox for dev
const FROM_ADDRESS = process.env.RESEND_FROM || 'V PATHing Rewards <onboarding@resend.dev>';

// ---------------------------------------------------------------------------
// Notification preference check
// ---------------------------------------------------------------------------
const shouldSendEmail = async (userId: number, notificationType: 'email' | 'cashback' | 'withdrawal' | 'newOffers'): Promise<boolean> => {
  try {
    const user = await dbGet(
      'SELECT notification_email, notification_cashback, notification_withdrawal, notification_new_offers FROM users WHERE id = ?',
      [userId]
    ) as { notification_email: number; notification_cashback: number; notification_withdrawal: number; notification_new_offers: number } | undefined;
    if (!user) return false;
    if (user.notification_email === 0) return false;
    switch (notificationType) {
      case 'cashback':   return user.notification_cashback === 1;
      case 'withdrawal': return user.notification_withdrawal === 1;
      case 'newOffers':  return user.notification_new_offers === 1;
      case 'email':      return user.notification_email === 1;
      default:           return false;
    }
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------
const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to V PATHing Rewards!',
    html: `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
        .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
        .button{display:inline-block;padding:12px 30px;background:#667eea;color:white;text-decoration:none;border-radius:5px;margin:20px 0}
        .footer{text-align:center;margin-top:30px;color:#666;font-size:12px}
      </style></head><body>
      <div class="container">
        <div class="header"><h1>Welcome to V PATHing Rewards!</h1></div>
        <div class="content">
          <h2>Hi ${name}! 👋</h2>
          <p>You're in! Start browsing offers and earn real cash back on every purchase.</p>
          <ul>
            <li>Browse hundreds of offers across top brands</li>
            <li>Click through our links and shop as normal</li>
            <li>Cash back is tracked and added to your account</li>
            <li>Withdraw once you reach $10</li>
          </ul>
          <p style="text-align:center"><a href="${appConfig.frontendUrl}" class="button">Start Earning</a></p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} V PATHing Rewards. All rights reserved.</p></div>
      </div></body></html>
    `,
  }),

  cashbackConfirmation: (name: string, amount: number, merchantName: string, offerTitle: string) => ({
    subject: `💰 Cashback Confirmed: $${amount.toFixed(2)} from ${merchantName}`,
    html: `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background:linear-gradient(135deg,#11998e,#38ef7d);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
        .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
        .amount{font-size:36px;font-weight:bold;color:#11998e;text-align:center;margin:20px 0}
        .button{display:inline-block;padding:12px 30px;background:#11998e;color:white;text-decoration:none;border-radius:5px;margin:20px 0}
        .footer{text-align:center;margin-top:30px;color:#666;font-size:12px}
      </style></head><body>
      <div class="container">
        <div class="header"><h1>💰 Cashback Confirmed!</h1></div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Your cashback has been confirmed and added to your account.</p>
          <div class="amount">$${amount.toFixed(2)}</div>
          <p><strong>Merchant:</strong> ${merchantName}<br><strong>Offer:</strong> ${offerTitle}</p>
          <p style="text-align:center"><a href="${appConfig.frontendUrl}/dashboard" class="button">View Earnings</a></p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} V PATHing Rewards.</p></div>
      </div></body></html>
    `,
  }),

  newOfferAlert: (name: string, offerTitle: string, merchantName: string, cashbackRate: number, offerId: number) => ({
    subject: `🎉 New Offer: ${cashbackRate}% Cashback at ${merchantName}!`,
    html: `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background:linear-gradient(135deg,#f093fb,#f5576c);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
        .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
        .badge{display:inline-block;background:#f5576c;color:white;padding:8px 16px;border-radius:20px;font-weight:bold;font-size:18px;margin:10px 0}
        .button{display:inline-block;padding:12px 30px;background:#f5576c;color:white;text-decoration:none;border-radius:5px;margin:20px 0}
        .footer{text-align:center;margin-top:30px;color:#666;font-size:12px}
      </style></head><body>
      <div class="container">
        <div class="header"><h1>🎉 New Offer Available!</h1></div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>A new cashback offer just dropped:</p>
          <h3>${merchantName}</h3>
          <p>${offerTitle}</p>
          <div class="badge">${cashbackRate}% Cash Back</div>
          <p style="text-align:center"><a href="${appConfig.frontendUrl}/offers/${offerId}" class="button">View Offer</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} V PATHing Rewards.</p>
          <p><a href="${appConfig.frontendUrl}/profile" style="color:#666">Manage notifications</a></p>
        </div>
      </div></body></html>
    `,
  }),

  withdrawalStatus: (name: string, amount: number, status: string, adminNotes?: string) => {
    const info: Record<string, { title: string; message: string; color: string }> = {
      pending:    { title: 'Withdrawal Request Received', message: 'Your request is under review.', color: '#667eea' },
      approved:   { title: 'Withdrawal Approved ✅',      message: 'Your withdrawal has been approved and is being processed.', color: '#11998e' },
      processing: { title: 'Withdrawal Processing ⏳',    message: 'Your withdrawal is currently being processed.', color: '#f39c12' },
      completed:  { title: 'Withdrawal Completed 🎉',     message: 'Your funds have been sent!', color: '#27ae60' },
      rejected:   { title: 'Withdrawal Rejected ❌',      message: 'Your withdrawal request was rejected.', color: '#e74c3c' },
    };
    const s = info[status] || { title: 'Withdrawal Update', message: `Status: ${status}`, color: '#667eea' };
    return {
      subject: `${s.title}: $${amount.toFixed(2)}`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
          .container{max-width:600px;margin:0 auto;padding:20px}
          .header{background:${s.color};color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
          .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
          .amount{font-size:36px;font-weight:bold;color:${s.color};text-align:center;margin:20px 0}
          .notes{background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;border-radius:5px}
          .button{display:inline-block;padding:12px 30px;background:${s.color};color:white;text-decoration:none;border-radius:5px;margin:20px 0}
          .footer{text-align:center;margin-top:30px;color:#666;font-size:12px}
        </style></head><body>
        <div class="container">
          <div class="header"><h1>${s.title}</h1></div>
          <div class="content">
            <h2>Hi ${name}!</h2>
            <p>${s.message}</p>
            <div class="amount">$${amount.toFixed(2)}</div>
            ${adminNotes ? `<div class="notes"><strong>Note:</strong> ${adminNotes}</div>` : ''}
            <p style="text-align:center"><a href="${appConfig.frontendUrl}/withdrawals" class="button">View Details</a></p>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} V PATHing Rewards.</p></div>
        </div></body></html>
      `,
    };
  },

  passwordReset: (name: string, resetUrl: string) => ({
    subject: 'Reset your V PATHing Rewards password',
    html: `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
        .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
        .button{display:inline-block;padding:14px 32px;background:#667eea;color:white;text-decoration:none;border-radius:6px;margin:20px 0;font-weight:bold}
        .note{font-size:13px;color:#888;margin-top:20px}
        .footer{text-align:center;margin-top:30px;color:#666;font-size:12px}
      </style></head><body>
      <div class="container">
        <div class="header"><h1>Password Reset Request</h1></div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>We received a request to reset your password. Click below to choose a new one.</p>
          <p style="text-align:center"><a href="${resetUrl}" class="button">Reset My Password</a></p>
          <p class="note">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} V PATHing Rewards.</p></div>
      </div></body></html>
    `,
  }),
};

// ---------------------------------------------------------------------------
// Core send function — uses Resend SDK
// ---------------------------------------------------------------------------
export const sendEmail = async (
  to: string,
  template: 'welcome' | 'cashbackConfirmation' | 'withdrawalStatus' | 'newOfferAlert' | 'passwordReset',
  data: any
): Promise<boolean> => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set — email not sent to', to);
      return false;
    }

    let content: { subject: string; html: string };
    switch (template) {
      case 'welcome':
        content = emailTemplates.welcome(data.name);
        break;
      case 'cashbackConfirmation':
        content = emailTemplates.cashbackConfirmation(data.name, data.amount, data.merchantName, data.offerTitle);
        break;
      case 'withdrawalStatus':
        content = emailTemplates.withdrawalStatus(data.name, data.amount, data.status, data.adminNotes);
        break;
      case 'newOfferAlert':
        content = emailTemplates.newOfferAlert(data.name, data.offerTitle, data.merchantName, data.cashbackRate, data.offerId);
        break;
      case 'passwordReset':
        content = emailTemplates.passwordReset(data.name, data.resetUrl);
        break;
      default:
        throw new Error('Invalid email template');
    }

    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to,
      subject: content.subject,
      html: content.html,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log(`📧 Email sent via Resend — to: ${to}, subject: ${content.subject}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Send with user notification preference check
// ---------------------------------------------------------------------------
export const sendEmailToUser = async (
  userId: number,
  userEmail: string,
  template: 'welcome' | 'cashbackConfirmation' | 'withdrawalStatus' | 'newOfferAlert' | 'passwordReset',
  data: any,
  notificationType: 'email' | 'cashback' | 'withdrawal' | 'newOffers' = 'email'
): Promise<boolean> => {
  const shouldSend = await shouldSendEmail(userId, notificationType);
  if (!shouldSend) {
    console.log(`Email skipped for user ${userId}: notification preference off`);
    return false;
  }
  return sendEmail(userEmail, template, data);
};

// ---------------------------------------------------------------------------
// Admin notifications
// ---------------------------------------------------------------------------
export const sendAdminNotification = async (
  adminEmail: string,
  template: 'brokenLinks',
  data: any
): Promise<boolean> => {
  try {
    if (!process.env.RESEND_API_KEY) return false;

    let subject = '';
    let html = '';

    if (template === 'brokenLinks') {
      const rows = data.offers.map((o: any) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${o.id}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${o.title}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;color:#dc2626;">${o.reason}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;font-size:11px;word-break:break-all;">${o.url}</td>
        </tr>`).join('');

      subject = `⚠️ V PATHing Rewards — ${data.brokenCount} Broken/Expired Offer Link${data.brokenCount !== 1 ? 's' : ''} Detected`;
      html = `
        <div style="font-family:sans-serif;max-width:700px;margin:0 auto;">
          <h2 style="color:#dc2626;">Broken/Expired Offer Links Detected</h2>
          <p>The daily link checker found <strong>${data.brokenCount}</strong> offer link(s) that need attention.</p>
          <p style="color:#6b7280;font-size:13px;">Checked at: ${data.checkedAt}</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px;text-align:left;">ID</th>
                <th style="padding:8px;text-align:left;">Offer Title</th>
                <th style="padding:8px;text-align:left;">Reason</th>
                <th style="padding:8px;text-align:left;">URL</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:24px;">
            <a href="${process.env.FRONTEND_URL}/admin/offers" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
              Review in Admin Panel
            </a>
          </p>
        </div>`;
    }

    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject,
      html,
    });

    if (error) { console.error('Admin notification error:', error); return false; }
    console.log(`📧 Admin notification sent — ${template}`);
    return true;
  } catch (err) {
    console.error('Error sending admin notification:', err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Bulk new offer alerts
// ---------------------------------------------------------------------------
export const sendNewOfferAlerts = async (
  offerId: number,
  offerTitle: string,
  merchantName: string,
  cashbackRate: number
): Promise<{ sent: number; failed: number }> => {
  try {
    const users = await dbAll(
      'SELECT id, email, name FROM users WHERE notification_email = 1 AND notification_new_offers = 1 AND is_admin = 0',
      []
    ) as { id: number; email: string; name: string }[];

    let sent = 0, failed = 0;
    await Promise.allSettled(users.map(async (user) => {
      const ok = await sendEmailToUser(user.id, user.email, 'newOfferAlert', { name: user.name, offerTitle, merchantName, cashbackRate, offerId }, 'newOffers');
      ok ? sent++ : failed++;
    }));

    console.log(`New offer alerts: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error) {
    console.error('Error sending new offer alerts:', error);
    return { sent: 0, failed: 0 };
  }
};
