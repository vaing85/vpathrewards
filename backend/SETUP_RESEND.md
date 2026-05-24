# Email setup — Resend

VPathRewards sends transactional email (password resets, withdrawal status,
cashback confirmations, new-offer alerts, welcome) through
[Resend](https://resend.com)'s HTTP API.

We use the HTTP API rather than SMTP because Railway and most modern PaaS
hosts block outbound SMTP, which surfaces as `ETIMEDOUT` on `CONN` in the
logs. HTTPS on port 443 is never blocked.

## One-time setup

### 1. Verify your sending domain in Resend

Resend dashboard → **Domains** → add `vpathrewards.store` (apex).

We send from the **apex domain** so customer replies can be caught by
**Cloudflare Email Routing** on the apex and forwarded to a real inbox
(see step 4). Resend Insights also lists `send.vpathrewards.store`
(subdomain) as a "Possible Improvement" for reputation isolation — the
tradeoff is that Cloudflare Email Routing is easier to wire up on the
apex than on a subdomain. We've chosen apex for simplicity; revisit if
deliverability ever becomes an issue.

Add the DNS records Resend shows you (SPF TXT, DKIM CNAME, DMARC TXT)
to Cloudflare. Wait for status to flip to **Verified** — usually a few minutes.

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
| `EMAIL_FROM` | `VPathRewards <hello@vpathrewards.store>` |
| `EMAIL_REPLY_TO` | `hello@vpathrewards.store` |

Note the mailbox is `hello@`, not `no-reply@`. Resend Insights flags
`no-reply` addresses ("Needs Attention → Don't use no-reply") because
replies disappear silently and modern providers downrank them for
deliverability. `EMAIL_REPLY_TO` is set explicitly so that even if we
later switch `EMAIL_FROM` to a `send.` subdomain, customer replies still
land at the apex address Cloudflare routes (next step).

Railway redeploys automatically after a variable change.

If you previously had `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASS`, or `SMTP_FROM` set, **delete them** — they are no longer read
by the code.

### 4. Route inbound replies via Cloudflare Email Routing

Now that the `from:` is a real mailbox (`hello@vpathrewards.store`),
customers can reply — but a reply will bounce unless something is
listening on that address. Cloudflare Email Routing is the free fix.

1. Cloudflare dashboard → `vpathrewards.store` → **Email** → **Email Routing** → Enable.
   Cloudflare adds the MX records and a Routing SPF TXT record automatically.
2. **Destination addresses** → add your real inbox (e.g. `vpathingenterprise@gmail.com`)
   and confirm the verification email Cloudflare sends.
3. **Routing rules** → add:
   - `hello@vpathrewards.store` → your real inbox
   - (optional) `support@vpathrewards.store` → same inbox
   - (optional) catch-all → same inbox

**SPF gotcha.** Cloudflare's auto-added SPF (`v=spf1 include:_spf.mx.cloudflare.net ~all`)
covers inbound only. Resend will have added its own SPF or asked you to
include it. If you end up with two SPF TXT records on the apex, merge
them into one (`v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all`
or similar — check what Resend gave you). Two separate SPF records is an
RFC violation and will fail validation.

**Don't add MX records to `send.` subdomains.** If you ever switch
`EMAIL_FROM` to a `send.` subdomain, leave the subdomain MX-less. That
signals to spam filters that it's send-only.

### 5. Sanity-check `FRONTEND_URL`

Email templates build links like `${FRONTEND_URL}/reset-password?token=...`.
In Railway's Variables UI the **value** field must be just the URL
(`https://vpathrewards.store`), not `FRONTEND_URL=https://vpathrewards.store`.
If you ever see a link in a sent email that starts with the literal text
`FRONTEND_URL=`, the value got the variable name prefixed — fix it in
Railway. The code strips this prefix defensively, but the right
fix is to set the value correctly.

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
