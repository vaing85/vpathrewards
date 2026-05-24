import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { dbGet, dbAll } from '../database';

// ---------------------------------------------------------------------------
// Email transport
// ---------------------------------------------------------------------------
// Production path: Resend HTTP API on port 443. Picked over SMTP because
// Railway (and most modern PaaS hosts) block outbound SMTP, which was the
// root cause of the long-standing ETIMEDOUT on CONN errors in the logs.
//
// Dev fallback: Ethereal — a fake SMTP service that captures sends and
// returns a preview URL. Used only when NODE_ENV=development AND no
// RESEND_API_KEY is set, so contributors don't need a Resend account to
// run the app locally.
// ---------------------------------------------------------------------------

// Lazy-init Resend client so missing env vars don't crash boot
let resendClient: Resend | null = null;
const getResend = (): Resend | null => {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
};

// Cache for Ethereal test account (dev fallback only)
let etherealAccount: nodemailer.TestAccount | null = null;

const createEtherealTransporter = async () => {
  if (!etherealAccount) {
    etherealAccount = await nodemailer.createTestAccount();
    console.log('📧 Ethereal Email configured for development');
    console.log('   Test account created:', etherealAccount.user);
  }
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: etherealAccount.user, pass: etherealAccount.pass },
  });
};

// Default from: a real (non-`noreply`) mailbox on the apex domain. Resend
// Insights flags `no-reply` addresses because replies disappear and modern
// providers downrank them. We use the apex (rather than the `send.`
// subdomain Resend recommends for reputation isolation) because Cloudflare
// Email Routing is set up on the apex — that's where customer replies are
// forwarded to a real inbox. Override via EMAIL_FROM if you ever want to
// switch to `send.vpathrewards.store`.
const DEFAULT_FROM = 'VPathRewards <hello@vpathrewards.store>';

// Reply-To: separate from the From: header so we can still send from a
// subdomain in the future without losing inbound routing. Customer replies
// land at this address, which Cloudflare Email Routing forwards to the
// real support inbox.
const DEFAULT_REPLY_TO = 'hello@vpathrewards.store';

// Brand
// Note: this is the email accent (button + headers for password reset/welcome).
// The real VPathRewards mark is navy + gold (frontend/public/vpathlogo.png);
// the full email re-skin to that palette is a future task.
const BRAND_COLOR = '#2563eb';
const BRAND_COLOR_DARK = '#1d4ed8';

// Defensive: if FRONTEND_URL was set in Railway with the literal `FRONTEND_URL=`
// prefix (a common copy/paste mistake from .env.example), strip it. Also trim
// stray whitespace and trailing slashes so URL concatenation is predictable.
const frontendUrl = (): string => {
  let raw = (process.env.FRONTEND_URL || 'http://localhost:3000').trim();
  if (raw.toUpperCase().startsWith('FRONTEND_URL=')) {
    raw = raw.slice('FRONTEND_URL='.length).trim();
  }
  return raw.replace(/\/+$/, '');
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

// ---------------------------------------------------------------------------
// Shared layout primitives
// ---------------------------------------------------------------------------

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&#39;');

// Hidden preheader: the text most inbox clients show next to the subject line.
// We pad with zero-width characters so the preheader doesn't get filled with
// the first line of body text in Gmail/Outlook previews.
const preheaderBlock = (text: string): string => `
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f5f7fa;">
    ${esc(text)}${'&zwnj;&nbsp;'.repeat(60)}
  </div>
`;

const button = (href: string, label: string, color: string = BRAND_COLOR): string => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;">
    <tr>
      <td style="border-radius:6px;background:${color};">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

const baseLayout = ({
  preheader,
  headerTitle,
  headerColor = BRAND_COLOR,
  body,
}: {
  preheader: string;
  headerTitle: string;
  headerColor?: string;
  body: string;
}): string => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${esc(headerTitle)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;">
    ${preheaderBlock(preheader)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fa;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
            <tr>
              <td style="background:${headerColor};padding:28px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="background:#ffffff;border-radius:8px;padding:4px;">
                            <img src="${frontendUrl()}/vpathlogo.png" alt="VPathRewards" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;">
                          </td>
                          <td style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">VPathRewards</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
                      ${esc(headerTitle)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1f2937;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #e5e7eb;background:#fafbfc;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;text-align:center;">
                <p style="margin:0 0 6px;">© ${new Date().getFullYear()} VPathRewards. All rights reserved.</p>
                <p style="margin:0;">
                  <a href="${frontendUrl()}/profile" style="color:#6b7280;text-decoration:underline;">Manage email preferences</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const emailTemplates = {
  welcome: (name: string) => {
    const url = frontendUrl();
    const preheader = 'Your VPathRewards account is ready — start earning cashback today.';
    return {
      subject: 'Welcome to VPathRewards',
      preheader,
      html: baseLayout({
        preheader,
        headerTitle: 'Welcome aboard',
        body: `
          <p style="margin:0 0 16px;font-size:18px;">Hi ${esc(name)},</p>
          <p style="margin:0 0 16px;">Thanks for joining VPathRewards. We're glad to have you. Here's what you can do from your dashboard:</p>
          <ul style="margin:0 0 16px;padding-left:20px;">
            <li style="margin-bottom:6px;">Browse hundreds of merchants and exclusive offers</li>
            <li style="margin-bottom:6px;">Earn cashback on every qualifying purchase</li>
            <li style="margin-bottom:6px;">Track your earnings in real time</li>
            <li style="margin-bottom:6px;">Withdraw to your bank when you're ready</li>
          </ul>
          ${button(url, 'Start earning cashback')}
          <p style="margin:24px 0 0;color:#6b7280;font-size:14px;">Questions? Just reply to this email — we read every message.</p>
        `,
      }),
      text:
`Welcome to VPathRewards

Hi ${name},

Thanks for joining VPathRewards. Here's what you can do:
- Browse hundreds of merchants and exclusive offers
- Earn cashback on every qualifying purchase
- Track your earnings in real time
- Withdraw to your bank when you're ready

Start earning: ${url}

Questions? Just reply to this email.

© ${new Date().getFullYear()} VPathRewards`,
    };
  },

  cashbackConfirmation: (name: string, amount: number, merchantName: string, offerTitle: string) => {
    const url = frontendUrl();
    const preheader = `$${amount.toFixed(2)} cashback from ${merchantName} has been confirmed.`;
    const accent = '#059669';
    return {
      subject: `Cashback confirmed: $${amount.toFixed(2)} from ${merchantName}`,
      preheader,
      html: baseLayout({
        preheader,
        headerTitle: 'Cashback confirmed',
        headerColor: accent,
        body: `
          <p style="margin:0 0 16px;font-size:18px;">Hi ${esc(name)},</p>
          <p style="margin:0 0 24px;">Your cashback has been confirmed and added to your balance.</p>
          <div style="text-align:center;font-size:40px;font-weight:700;color:${accent};margin:8px 0 24px;">
            $${amount.toFixed(2)}
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f9fafb;border-radius:8px;padding:0;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong>Merchant:</strong> ${esc(merchantName)}</td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong>Offer:</strong> ${esc(offerTitle)}</td></tr>
            <tr><td style="padding:12px 16px;"><strong>Status:</strong> <span style="color:${accent};font-weight:600;">Confirmed</span></td></tr>
          </table>
          ${button(`${url}/dashboard`, 'View your earnings', accent)}
          <p style="margin:24px 0 0;color:#6b7280;font-size:14px;">You can withdraw once you reach the minimum withdrawal threshold.</p>
        `,
      }),
      text:
`Cashback confirmed

Hi ${name},

Your cashback has been confirmed and added to your balance.

Amount: $${amount.toFixed(2)}
Merchant: ${merchantName}
Offer: ${offerTitle}
Status: Confirmed

View your earnings: ${url}/dashboard

© ${new Date().getFullYear()} VPathRewards`,
    };
  },

  passwordReset: (name: string, resetLink: string) => {
    const preheader = 'Click to choose a new password. Link expires in 1 hour.';
    return {
      subject: 'Reset your VPathRewards password',
      preheader,
      html: baseLayout({
        preheader,
        headerTitle: 'Reset your password',
        body: `
          <p style="margin:0 0 16px;font-size:18px;">Hi ${esc(name)},</p>
          <p style="margin:0 0 16px;">We received a request to reset the password on your VPathRewards account. Click the button below to choose a new one.</p>
          ${button(resetLink, 'Reset password')}
          <p style="margin:16px 0;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email — your password won't change.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="margin:0;word-break:break-all;font-size:13px;"><a href="${resetLink}" style="color:${BRAND_COLOR};">${esc(resetLink)}</a></p>
        `,
      }),
      text:
`Reset your VPathRewards password

Hi ${name},

We received a request to reset the password on your VPathRewards account. Click the link below to choose a new one:

${resetLink}

This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.

© ${new Date().getFullYear()} VPathRewards`,
    };
  },

  newOfferAlert: (name: string, offerTitle: string, merchantName: string, cashbackRate: number, offerId: number) => {
    const url = frontendUrl();
    const accent = '#db2777';
    const preheader = `${cashbackRate}% cashback at ${merchantName} — just added.`;
    return {
      subject: `New offer: ${cashbackRate}% cashback at ${merchantName}`,
      preheader,
      html: baseLayout({
        preheader,
        headerTitle: 'New offer available',
        headerColor: accent,
        body: `
          <p style="margin:0 0 16px;font-size:18px;">Hi ${esc(name)},</p>
          <p style="margin:0 0 24px;">We just added a new cashback offer that might interest you.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fdf2f8;border-left:4px solid ${accent};border-radius:8px;">
            <tr><td style="padding:20px;">
              <div style="font-size:18px;font-weight:700;color:#1f2937;margin-bottom:6px;">${esc(merchantName)}</div>
              <div style="color:#4b5563;margin-bottom:12px;">${esc(offerTitle)}</div>
              <div style="display:inline-block;background:${accent};color:#ffffff;padding:6px 14px;border-radius:999px;font-weight:700;font-size:14px;">${cashbackRate}% Cashback</div>
            </td></tr>
          </table>
          ${button(`${url}/offers/${offerId}`, 'View offer', accent)}
        `,
      }),
      text:
`New offer available

Hi ${name},

We just added a new cashback offer.

${merchantName}
${offerTitle}
${cashbackRate}% cashback

View offer: ${url}/offers/${offerId}

© ${new Date().getFullYear()} VPathRewards`,
    };
  },

  withdrawalStatus: (name: string, amount: number, status: string, adminNotes?: string) => {
    const url = frontendUrl();
    const statusMessages: Record<string, { title: string; message: string; color: string }> = {
      pending: {
        title: 'Withdrawal received',
        message: 'Your withdrawal request has been received and is under review. We will process it as soon as possible.',
        color: BRAND_COLOR,
      },
      approved: {
        title: 'Withdrawal approved',
        message: 'Your withdrawal request has been approved and is being processed.',
        color: '#059669',
      },
      processing: {
        title: 'Withdrawal processing',
        message: 'Your withdrawal is currently being processed.',
        color: '#d97706',
      },
      completed: {
        title: 'Withdrawal completed',
        message: 'Your withdrawal has been completed and the funds have been sent.',
        color: '#059669',
      },
      rejected: {
        title: 'Withdrawal rejected',
        message: 'Your withdrawal request has been rejected.',
        color: '#dc2626',
      },
    };

    const statusInfo = statusMessages[status] || {
      title: 'Withdrawal update',
      message: `Your withdrawal status has been updated to: ${status}`,
      color: BRAND_COLOR,
    };

    const preheader = `${statusInfo.title}: $${amount.toFixed(2)}`;
    const prettyStatus = status.charAt(0).toUpperCase() + status.slice(1);

    return {
      subject: `${statusInfo.title}: $${amount.toFixed(2)}`,
      preheader,
      html: baseLayout({
        preheader,
        headerTitle: statusInfo.title,
        headerColor: statusInfo.color,
        body: `
          <p style="margin:0 0 16px;font-size:18px;">Hi ${esc(name)},</p>
          <p style="margin:0 0 24px;">${esc(statusInfo.message)}</p>
          <div style="text-align:center;font-size:40px;font-weight:700;color:${statusInfo.color};margin:8px 0 24px;">
            $${amount.toFixed(2)}
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f9fafb;border-radius:8px;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong>Amount:</strong> $${amount.toFixed(2)}</td></tr>
            <tr><td style="padding:12px 16px;"><strong>Status:</strong> <span style="color:${statusInfo.color};font-weight:600;">${esc(prettyStatus)}</span></td></tr>
          </table>
          ${adminNotes ? `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;margin-top:20px;">
              <tr><td style="padding:16px;">
                <strong style="display:block;margin-bottom:6px;">Admin notes</strong>
                <span style="color:#1f2937;">${esc(adminNotes)}</span>
              </td></tr>
            </table>
          ` : ''}
          ${button(`${url}/withdrawals`, 'View withdrawal details', statusInfo.color)}
          ${status === 'rejected' ? '<p style="margin:16px 0 0;color:#6b7280;font-size:14px;">If you have questions about this rejection, just reply to this email.</p>' : ''}
        `,
      }),
      text:
`${statusInfo.title}

Hi ${name},

${statusInfo.message}

Amount: $${amount.toFixed(2)}
Status: ${prettyStatus}
${adminNotes ? `\nAdmin notes: ${adminNotes}\n` : ''}
View details: ${url}/withdrawals
${status === 'rejected' ? '\nIf you have questions, reply to this email.\n' : ''}
© ${new Date().getFullYear()} VPathRewards`,
    };
  },

  adminLinkAlert: (data: {
    note: string;
    brokenCount: number;
    expiredCount: number;
    totalChecked: number;
    brokenOffers?: Array<{ id: number; title: string; url: string; reason: string }>;
  }) => {
    const url = frontendUrl();
    const accent = '#d97706';
    const total = data.brokenCount + data.expiredCount;
    const preheader = `${data.brokenCount} broken, ${data.expiredCount} expired out of ${data.totalChecked} checked.`;

    // Show at most the first 10 offers inline so the email doesn't balloon.
    const offers = (data.brokenOffers || []).slice(0, 10);
    const offerRows = offers.map((o) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
          <div style="font-weight:600;color:#1f2937;">#${o.id} ${esc(o.title)}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:2px;">${esc(o.reason)}</div>
        </td>
      </tr>
    `).join('');
    const moreCount = (data.brokenOffers?.length || 0) - offers.length;

    return {
      subject: `[VPathRewards] ${total} offer link${total === 1 ? '' : 's'} need attention`,
      preheader,
      html: baseLayout({
        preheader,
        headerTitle: 'Broken offer links',
        headerColor: accent,
        body: `
          <p style="margin:0 0 16px;font-size:18px;">Hi Admin,</p>
          <p style="margin:0 0 20px;">${esc(data.note)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fffbeb;border-radius:8px;margin-bottom:20px;">
            <tr>
              <td align="center" style="padding:16px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:0 16px;text-align:center;">
                      <div style="font-size:28px;font-weight:700;color:${accent};">${data.brokenCount}</div>
                      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Broken</div>
                    </td>
                    <td style="padding:0 16px;text-align:center;">
                      <div style="font-size:28px;font-weight:700;color:${accent};">${data.expiredCount}</div>
                      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Expired</div>
                    </td>
                    <td style="padding:0 16px;text-align:center;">
                      <div style="font-size:28px;font-weight:700;color:#1f2937;">${data.totalChecked}</div>
                      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Checked</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          ${offers.length > 0 ? `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f9fafb;border-radius:8px;overflow:hidden;">
              ${offerRows}
            </table>
            ${moreCount > 0 ? `<p style="margin:12px 0 0;color:#6b7280;font-size:13px;text-align:center;">…and ${moreCount} more</p>` : ''}
          ` : ''}
          ${button(`${url}/admin/offers`, 'Review offers', accent)}
        `,
      }),
      text:
`Broken offer links

Hi Admin,

${data.note}

Broken: ${data.brokenCount}
Expired: ${data.expiredCount}
Checked: ${data.totalChecked}
${offers.length > 0 ? '\nFirst ' + offers.length + ':\n' + offers.map(o => `- #${o.id} ${o.title} — ${o.reason}`).join('\n') + (moreCount > 0 ? `\n…and ${moreCount} more` : '') + '\n' : ''}
Review offers: ${url}/admin/offers

© ${new Date().getFullYear()} VPathRewards`,
    };
  },
};

// Send email function
export const sendEmail = async (
  to: string,
  template: 'welcome' | 'cashbackConfirmation' | 'withdrawalStatus' | 'newOfferAlert' | 'passwordReset' | 'adminLinkAlert',
  data: any
): Promise<boolean> => {
  try {
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
        emailContent = emailTemplates.passwordReset(data.name, data.resetLink);
        break;
      case 'adminLinkAlert':
        emailContent = emailTemplates.adminLinkAlert(data);
        break;
      default:
        throw new Error('Invalid email template');
    }

    const fromAddress = process.env.EMAIL_FROM || DEFAULT_FROM;
    const replyToAddress = process.env.EMAIL_REPLY_TO || DEFAULT_REPLY_TO;
    const resend = getResend();

    // --- Production path: Resend HTTP API -----------------------------
    if (resend) {
      const { data: sent, error } = await resend.emails.send({
        from: fromAddress,
        replyTo: replyToAddress,
        to,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      if (error) {
        console.error('Resend send error:', error);
        return false;
      }

      console.log('📧 Email sent successfully:', sent?.id);
      console.log('   To:', to);
      console.log('   Subject:', emailContent.subject);
      return true;
    }

    // --- Dev fallback: Ethereal (only when RESEND_API_KEY is unset) ----
    if (process.env.NODE_ENV !== 'production') {
      const transporter = await createEtherealTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        replyTo: replyToAddress,
        to,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('📧 Email sent via Ethereal Email');
      console.log('   Preview URL:', previewUrl);
      console.log('   To:', to);
      console.log('   Subject:', emailContent.subject);
      return true;
    }

    // --- Production without RESEND_API_KEY: warn and skip --------------
    console.warn('RESEND_API_KEY not configured. Email not sent.');
    return false;
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
