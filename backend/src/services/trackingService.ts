import { dbAll, dbGet, dbRun } from '../database';
import { createReferralEarning } from './rewards-core';

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export async function getOrCreateReferralCode(userId: number) {
  let row = await dbGet(
    'SELECT referral_code FROM user_referral_codes WHERE user_id = ?',
    [userId]
  ) as { referral_code: string } | undefined;

  if (!row) {
    const code = `REF${userId}${Date.now().toString().slice(-6)}`;
    await dbRun(
      'INSERT INTO user_referral_codes (user_id, referral_code) VALUES (?, ?)',
      [userId, code]
    );
    row = { referral_code: code };
  }
  return row.referral_code;
}

export interface TrackClickInput {
  offer_id: number;
  session_id?: string;
  referral_code?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
}

export async function trackClick(input: TrackClickInput) {
  const { offer_id, session_id, referral_code, ip_address = 'unknown', user_agent = 'unknown', referrer = 'direct' } = input;

  const offer = await dbGet('SELECT * FROM offers WHERE id = ? AND is_active = 1', [offer_id]);
  if (!offer) return null;

  let userId: number | null = null;
  if (referral_code) {
    const userRef = await dbGet(
      'SELECT user_id FROM user_referral_codes WHERE referral_code = ?',
      [referral_code]
    ) as { user_id: number } | undefined;
    if (userRef) userId = userRef.user_id;
  }

  const trackingSessionId = session_id || generateSessionId();

  const result = await dbRun(
    `INSERT INTO affiliate_clicks (user_id, offer_id, session_id, ip_address, user_agent, referrer)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, offer_id, trackingSessionId, ip_address, user_agent, referrer]
  );
  const clickId = (result as { lastID: number }).lastID;
  const offerRow = offer as { affiliate_link?: string };
  return {
    click_id: clickId,
    session_id: trackingSessionId,
    tracking_url: `${offerRow.affiliate_link || ''}?ref=${trackingSessionId}&click_id=${clickId}`
  };
}

export interface RecordConversionInput {
  session_id: string;
  click_id?: number;
  order_id?: string;
  order_amount?: number;
  commission_amount?: number;
}

export async function recordConversion(input: RecordConversionInput) {
  const { session_id, click_id, order_id, order_amount, commission_amount } = input;

  const click = await dbGet(
    'SELECT * FROM affiliate_clicks WHERE session_id = ? OR id = ?',
    [session_id, click_id || 0]
  ) as { id: number; user_id: number | null; offer_id: number } | undefined;

  if (!click) return null;

  const existing = await dbGet(
    'SELECT * FROM conversions WHERE click_id = ? OR (session_id = ? AND order_id = ?)',
    [click.id, session_id, order_id || '']
  );
  if (existing) return { existing: true, conversion: existing };

  const offer = await dbGet('SELECT cashback_rate FROM offers WHERE id = ?', [click.offer_id]) as { cashback_rate: number } | undefined;
  const commission = commission_amount ?? (order_amount != null && offer ? (order_amount * offer.cashback_rate / 100) : 0);

  const result = await dbRun(
    `INSERT INTO conversions (click_id, user_id, offer_id, session_id, order_id, order_amount, commission_amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [click.id, click.user_id, click.offer_id, session_id, order_id ?? null, order_amount ?? null, commission, 'pending']
  );
  const conversionId = (result as { lastID: number }).lastID;

  await dbRun(
    'UPDATE affiliate_clicks SET converted = 1, conversion_id = ? WHERE id = ?',
    [conversionId, click.id]
  );

  if (click.user_id && commission > 0) {
    const txResult = await dbRun(
      'INSERT INTO cashback_transactions (user_id, offer_id, amount, status) VALUES (?, ?, ?, ?)',
      [click.user_id, click.offer_id, commission, 'pending']
    );
    const transactionId = (txResult as { lastID: number }).lastID;
    await dbRun('UPDATE users SET total_earnings = total_earnings + ? WHERE id = ?', [commission, click.user_id]);
    createReferralEarning(click.user_id, transactionId, commission).catch(err => console.error('Error creating referral earning:', err));
  }

  return { existing: false, conversion_id: conversionId };
}

export async function getClickAnalytics(userId: number) {
  return dbAll(
    `SELECT 
       ac.*,
       o.title as offer_title,
       o.cashback_rate,
       m.name as merchant_name,
       CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as converted
     FROM affiliate_clicks ac
     JOIN offers o ON ac.offer_id = o.id
     JOIN merchants m ON o.merchant_id = m.id
     LEFT JOIN conversions c ON ac.id = c.click_id
     WHERE ac.user_id = ?
     ORDER BY ac.clicked_at DESC
     LIMIT 100`,
    [userId]
  );
}

export async function getConversionAnalytics(userId: number) {
  return dbAll(
    `SELECT 
       c.*,
       o.title as offer_title,
       o.cashback_rate,
       m.name as merchant_name
     FROM conversions c
     JOIN offers o ON c.offer_id = o.id
     JOIN merchants m ON o.merchant_id = m.id
     WHERE c.user_id = ?
     ORDER BY c.conversion_date DESC
     LIMIT 100`,
    [userId]
  );
}
