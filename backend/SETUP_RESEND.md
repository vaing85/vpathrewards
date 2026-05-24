# Email setup — Resend

VPathRewards sends transactional email (password resets, withdrawal status,
cashback confirmations, new-offer alerts, welcome) through
[Resend](https://resend.com)'s HTTP API.

We use the HTTP API rather than SMTP because Railway and most modern PaaS
hosts block outbound SMTP, which surfaces as `ETIMEDOUT` on `CONN` in the
logs. HTTPS on port 443 is never blocked.

## One-time setup

### 1. Verify your sending domain in Resend

Resend dashboard → **Domains** → add `vpathrewards.store` (or whichever
domain you'll send from). Add the four DNS records Resend shows you to
your DNS provider (Cloudflare in our case). Wait for status to flip to
**Verified** — usually a few minutes.

Without a verified domain, Resend will either refuse sends or force them
to come from `onboarding@resend.dev`.

### 2. Create an API key

Resend dashboard → **API keys** → **Create API Key**.

- Name: `vpathrewards-backend-production`
- Permission: **Sending access** (you don't need Full access for transactional sends)

Copy the key (starts with `re_`). You'll only see it once.

### 3. Set Railway environment variables

Railway dashboard → backend service → **Variables**:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | `re_...` (from step 2) |
| `EMAIL_FROM` | `VPathRewards <noreply@vpathrewards.store>` |

Railway redeploys automatically after a variable change.

If you previously had `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASS`, or `SMTP_FROM` set, **delete them** — they are no longer read
by the code.

## Local development

For local development you have two options:

**Option A — Use Resend in dev too** (closest to production)
Set `RESEND_API_KEY` in your local `backend/.env`. Sends go through the
real Resend account; they count against your quota.

**Option B — Use the Ethereal fallback** (no Resend account needed)
Leave `RESEND_API_KEY` unset. With `NODE_ENV=development`, the email
service falls through to [Ethereal](https://ethereal.email), a fake SMTP
service. Each send logs a preview URL you can open in a browser to see
what the email looked like. Nothing is delivered to real inboxes.

## Verifying email is working

After deployment, the simplest end-to-end test is to trigger a password
reset from the login page. Check:

- **Resend dashboard → Emails** — the send should appear with status
  `Delivered` (or `Bounced` if the address doesn't exist).
- **Railway logs** — look for `📧 Email sent successfully: <id>`.
- Your inbox — the email should arrive within a few seconds.

If you see `RESEND_API_KEY not configured. Email not sent.` in the
Railway logs, the env var didn't take. Re-check spelling and that the
service was redeployed after you saved.

## Code reference

The transport lives in [src/utils/emailService.ts](src/utils/emailService.ts).
The public API (`sendEmail`, `sendEmailToUser`, `sendNewOfferAlerts`) is
unchanged from the previous nodemailer implementation, so all 8 callers
(auth, withdrawals, admin routes, payout processor, jobs) work without
modification.
