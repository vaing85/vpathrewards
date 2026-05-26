/**
 * Shared analytics queries used by both the user-facing (/api/analytics) and
 * admin (/api/admin/analytics) routes so the two stay in sync.
 */
import { dbAll, dbGet } from '../database';

function dateThresholdStr(daysNum: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysNum);
  return d.toISOString();
}

/**
 * @param includeTopUsers when true, also returns the most-engaged users
 *   (includes names/emails) — admin-only. Defaults to false so the
 *   user-facing route never leaks other users' PII.
 */
export async function getEngagementMetrics(daysNum: number, includeTopUsers = false) {
  const threshold = dateThresholdStr(daysNum);

  const activeUsers = (await dbGet(
    `SELECT COUNT(DISTINCT user_id) as count
       FROM affiliate_clicks
      WHERE clicked_at >= ? AND user_id IS NOT NULL`,
    [threshold]
  )) as { count: number };

  const activityBreakdown = await dbAll(
    `SELECT DATE(clicked_at) as date,
            COUNT(*) as clicks,
            COUNT(DISTINCT user_id) as active_users
       FROM affiliate_clicks
      WHERE clicked_at >= ?
      GROUP BY DATE(clicked_at)
      ORDER BY date DESC`,
    [threshold]
  );

  const base = {
    period_days: daysNum,
    active_users: activeUsers.count || 0,
    activity_breakdown: activityBreakdown,
  };

  if (!includeTopUsers) return base;

  // Most engaged users — subquery avoids an expensive JOIN over all clicks.
  const topUsers = await dbAll(
    `SELECT u.id, u.name, u.email,
            COALESCE(click_stats.click_count, 0) as click_count,
            COALESCE(conversion_stats.conversion_count, 0) as conversion_count,
            COALESCE(conversion_stats.total_earned, 0) as total_earned
       FROM users u
       INNER JOIN (
         SELECT user_id, COUNT(*) as click_count
           FROM affiliate_clicks
          WHERE clicked_at >= ? AND user_id IS NOT NULL
          GROUP BY user_id
          ORDER BY click_count DESC
          LIMIT 10
       ) click_stats ON u.id = click_stats.user_id
       LEFT JOIN (
         SELECT ac.user_id,
                COUNT(DISTINCT c.id) as conversion_count,
                SUM(c.commission_amount) as total_earned
           FROM conversions c
           JOIN affiliate_clicks ac ON c.click_id = ac.id
          WHERE ac.clicked_at >= ? AND ac.user_id IS NOT NULL
          GROUP BY ac.user_id
       ) conversion_stats ON u.id = conversion_stats.user_id
      ORDER BY click_stats.click_count DESC`,
    [threshold, threshold]
  );

  return { ...base, top_users: topUsers };
}

export async function getRevenueAnalytics(daysNum: number, groupBy: string = 'day') {
  const threshold = dateThresholdStr(daysNum);

  let dateFormat = 'DATE(c.conversion_date)';
  if (groupBy === 'week') {
    dateFormat = "strftime('%Y-W%W', c.conversion_date)";
  } else if (groupBy === 'month') {
    dateFormat = "strftime('%Y-%m', c.conversion_date)";
  }

  const breakdown = await dbAll(
    `SELECT ${dateFormat} as period,
            COUNT(*) as conversion_count,
            SUM(order_amount) as total_revenue,
            SUM(commission_amount) as total_commission,
            AVG(order_amount) as avg_order_value,
            AVG(commission_amount) as avg_commission
       FROM conversions c
      WHERE c.conversion_date >= ? AND c.status IN ('pending', 'confirmed')
      GROUP BY ${dateFormat}
      ORDER BY period DESC`,
    [threshold]
  );

  const overall = (await dbGet(
    `SELECT COUNT(*) as total_conversions,
            SUM(order_amount) as total_revenue,
            SUM(commission_amount) as total_commission,
            AVG(order_amount) as avg_order_value,
            AVG(commission_amount) as avg_commission,
            MIN(order_amount) as min_order,
            MAX(order_amount) as max_order
       FROM conversions
      WHERE conversion_date >= ? AND status IN ('pending', 'confirmed')`,
    [threshold]
  )) as Record<string, number> | undefined;

  const byMerchant = await dbAll(
    `SELECT m.id, m.name, m.category,
            COUNT(c.id) as conversion_count,
            SUM(c.order_amount) as total_revenue,
            SUM(c.commission_amount) as total_commission
       FROM conversions c
       JOIN offers o ON c.offer_id = o.id
       JOIN merchants m ON o.merchant_id = m.id
      WHERE c.conversion_date >= ? AND c.status IN ('pending', 'confirmed')
      GROUP BY m.id, m.name, m.category
      ORDER BY total_commission DESC
      LIMIT 10`,
    [threshold]
  );

  return {
    period_days: daysNum,
    group_by: groupBy,
    overall: overall || {},
    breakdown,
    by_merchant: byMerchant,
  };
}
