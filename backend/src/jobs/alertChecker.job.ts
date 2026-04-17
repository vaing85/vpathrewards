/**
 * Checks all active cashback alerts and notifies users when a rate
 * has increased above their threshold (or any increase if no threshold set).
 */
import { dbAll, dbRun } from '../database';
import { createNotification } from '../routes/notifications';

interface Alert {
  id: number;
  user_id: number;
  merchant_id: number | null;
  offer_id: number | null;
  threshold_rate: number | null;
  last_triggered_at: string | null;
  merchant_name: string | null;
  offer_title: string | null;
  current_rate: number | null;
  prev_rate: number | null;
}

export async function checkCashbackAlerts() {
  const alerts = await dbAll<Alert>(`
    SELECT a.*,
           m.name as merchant_name,
           o.title as offer_title,
           o.cashback_rate as current_rate,
           NULL as prev_rate
    FROM cashback_alerts a
    LEFT JOIN merchants m ON a.merchant_id = m.id
    LEFT JOIN offers o ON a.offer_id = o.id
    WHERE a.is_active = 1
  `);

  let triggered = 0;
  for (const alert of alerts) {
    if (alert.current_rate === null) continue;

    const threshold = alert.threshold_rate ?? 0;
    if (alert.current_rate <= threshold) continue;

    // Cooldown: don't re-trigger within 24h
    if (alert.last_triggered_at) {
      const lastMs = new Date(alert.last_triggered_at).getTime();
      if (Date.now() - lastMs < 24 * 60 * 60 * 1000) continue;
    }

    const subject = alert.merchant_name ?? alert.offer_title ?? 'an offer';
    await createNotification(
      alert.user_id,
      'rate_alert',
      'Cashback Rate Alert',
      `${subject} now offers ${alert.current_rate}% cashback — above your ${threshold}% threshold!`
    );

    await dbRun(
      'UPDATE cashback_alerts SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = ?',
      [alert.id]
    );
    triggered++;
  }

  if (triggered > 0) console.log(`[alertChecker] Triggered ${triggered} alert(s)`);
}
