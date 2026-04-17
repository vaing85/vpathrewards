import { dbAll, dbGet, dbRun } from '../database';
import { createReferralEarning, computeCashbackAmount } from './rewards-core';
import { PLANS, PlanKey } from './stripeService';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export async function getTransactions(userId: number, options: PaginationOptions) {
  const { page, limit } = options;
  const offset = (page - 1) * limit;

  const totalResult = await dbGet(
    'SELECT COUNT(*) as total FROM cashback_transactions WHERE user_id = ?',
    [userId]
  ) as { total: number };
  const total = totalResult?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const transactions = await dbAll(
    `SELECT ct.*, o.title as offer_title, o.cashback_rate, m.name as merchant_name, m.logo_url as merchant_logo
     FROM cashback_transactions ct
     JOIN offers o ON ct.offer_id = o.id
     JOIN merchants m ON o.merchant_id = m.id
     WHERE ct.user_id = ?
     ORDER BY ct.transaction_date DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return {
    data: transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

export async function getSummary(userId: number) {
  const user = await dbGet('SELECT total_earnings FROM users WHERE id = ?', [userId]) as { total_earnings: number } | undefined;
  const stats = await dbGet(
    `SELECT 
       COUNT(*) as total_transactions,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
       COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as confirmed_earnings
     FROM cashback_transactions WHERE user_id = ?`,
    [userId]
  ) as { total_transactions: number; pending_earnings: number; confirmed_earnings: number } | undefined;

  return {
    total_earnings: user?.total_earnings || 0,
    total_transactions: stats?.total_transactions || 0,
    pending_earnings: stats?.pending_earnings || 0,
    confirmed_earnings: stats?.confirmed_earnings || 0
  };
}

export async function getHistory(
  userId: number,
  params: { group_by?: string; days?: number; status?: string }
) {
  const { group_by = 'day', days = 30, status } = params;
  const daysNum = typeof days === 'number' ? days : parseInt(String(days), 10) || 30;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysNum);
  const dateThresholdStr = dateThreshold.toISOString();

  let dateFormat = 'DATE(transaction_date)';
  if (group_by === 'week') dateFormat = "strftime('%Y-W%W', transaction_date)";
  else if (group_by === 'month') dateFormat = "strftime('%Y-%m', transaction_date)";

  let statusFilter = '';
  const queryParams: unknown[] = [userId, dateThresholdStr];
  if (status && ['pending', 'confirmed', 'rejected'].includes(status)) {
    statusFilter = 'AND status = ?';
    queryParams.push(status);
  }

  interface GroupedRow { period: string; total_amount: number; }
  const groupedData = await dbAll<GroupedRow>(
    `SELECT ${dateFormat} as period, COUNT(*) as transaction_count,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as confirmed_amount,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
     FROM cashback_transactions
     WHERE user_id = ? AND transaction_date >= ? ${statusFilter}
     GROUP BY ${dateFormat} ORDER BY period DESC`,
    queryParams
  );

  const timeSeriesData = (groupedData || []).map((item) => ({
    period: item.period || '',
    amount: parseFloat(String(item.total_amount)) || 0
  })).sort((a, b) => (a.period || '').localeCompare(b.period || ''));

  let runningTotal = 0;
  const cumulativeData = timeSeriesData.map((item: { period: string; amount: number }) => {
    runningTotal += item.amount;
    return { period: item.period, cumulative_earnings: runningTotal };
  });

  const byMerchant = await dbAll(
    `SELECT m.id, m.name, m.logo_url, COUNT(ct.id) as transaction_count,
      COALESCE(SUM(ct.amount), 0) as total_amount, COALESCE(AVG(ct.amount), 0) as avg_amount
     FROM cashback_transactions ct
     INNER JOIN offers o ON ct.offer_id = o.id
     INNER JOIN merchants m ON o.merchant_id = m.id
     WHERE ct.user_id = ? AND ct.transaction_date >= ? ${statusFilter}
     GROUP BY m.id, m.name, m.logo_url ORDER BY total_amount DESC LIMIT 10`,
    queryParams
  );

  const byCategory = await dbAll(
    `SELECT m.category, COUNT(ct.id) as transaction_count, COALESCE(SUM(ct.amount), 0) as total_amount
     FROM cashback_transactions ct
     INNER JOIN offers o ON ct.offer_id = o.id
     INNER JOIN merchants m ON o.merchant_id = m.id
     WHERE ct.user_id = ? AND ct.transaction_date >= ? ${statusFilter}
     GROUP BY m.category ORDER BY total_amount DESC`,
    queryParams
  );

  return {
    period_days: daysNum,
    group_by,
    time_series: groupedData || [],
    cumulative: cumulativeData,
    by_merchant: byMerchant || [],
    by_category: byCategory || []
  };
}

export async function getCalendar(userId: number, year: number, month: number) {
  const yearStr = year.toString();
  const monthStr = month.toString().padStart(2, '0');
  const calendarData = await dbAll(
    `SELECT DATE(transaction_date) as date, COUNT(*) as transaction_count, SUM(amount) as total_amount,
      SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as confirmed_amount,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
     FROM cashback_transactions
     WHERE user_id = ? AND strftime('%Y', transaction_date) = ? AND strftime('%m', transaction_date) = ?
     GROUP BY DATE(transaction_date) ORDER BY date`,
    [userId, yearStr, monthStr]
  );
  return { year, month, data: calendarData };
}

export async function getGoals(userId: number) {
  const goals = await dbAll('SELECT * FROM cashback_goals WHERE user_id = ? ORDER BY created_at DESC', [userId]) || [];
  if (goals.length === 0) return goals;

  const allTransactions = await dbAll(
    'SELECT amount, transaction_date FROM cashback_transactions WHERE user_id = ? AND status = ? ORDER BY transaction_date',
    [userId, 'confirmed']
  ) as { amount: number; transaction_date: string }[] | undefined;

  const transactions = allTransactions || [];

  for (const goal of goals as { id: number; start_date: string | null; end_date: string | null; target_amount: number; current_amount?: number; is_completed?: number }[]) {
    let total = 0;
    for (const tx of transactions) {
      const transDate = new Date(tx.transaction_date);
      if (goal.start_date && transDate < new Date(goal.start_date)) continue;
      if (goal.end_date && transDate > new Date(goal.end_date)) continue;
      total += parseFloat(String(tx.amount)) || 0;
    }
    goal.current_amount = total;
    goal.is_completed = total >= (parseFloat(String(goal.target_amount)) || 0) ? 1 : 0;
    await dbRun('UPDATE cashback_goals SET current_amount = ?, is_completed = ? WHERE id = ?', [total, goal.is_completed, goal.id]);
  }
  return goals;
}

export async function createGoal(
  userId: number,
  data: { title: string; target_amount: number; period_type?: string; start_date?: string | null; end_date?: string | null }
) {
  const { title, target_amount, period_type = 'monthly', start_date = null, end_date = null } = data;
  const result = await dbRun(
    'INSERT INTO cashback_goals (user_id, title, target_amount, period_type, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, title, target_amount, period_type, start_date, end_date]
  );
  const goalId = (result as { lastID: number }).lastID;
  return dbGet('SELECT * FROM cashback_goals WHERE id = ?', [goalId]);
}

export async function updateGoal(
  userId: number,
  goalId: string | number,
  data: { title?: string; target_amount?: number; period_type?: string; start_date?: string | null; end_date?: string | null }
) {
  const goal = await dbGet('SELECT * FROM cashback_goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  if (!goal) return null;
  const { title, target_amount, period_type, start_date, end_date } = data;
  await dbRun(
    'UPDATE cashback_goals SET title = ?, target_amount = ?, period_type = ?, start_date = ?, end_date = ? WHERE id = ? AND user_id = ?',
    [title ?? (goal as { title: string }).title, target_amount ?? (goal as { target_amount: number }).target_amount, period_type ?? (goal as { period_type: string }).period_type, start_date ?? (goal as { start_date: string | null }).start_date, end_date ?? (goal as { end_date: string | null }).end_date, goalId, userId]
  );
  return dbGet('SELECT * FROM cashback_goals WHERE id = ?', [goalId]);
}

export async function deleteGoal(userId: number, goalId: string | number) {
  const goal = await dbGet('SELECT id FROM cashback_goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  if (!goal) return false;
  await dbRun('DELETE FROM cashback_goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  return true;
}

export async function trackCashback(userId: number, offerId: number, purchaseAmount: number) {
  const offer = await dbGet('SELECT * FROM offers WHERE id = ? AND is_active = 1', [offerId]) as { id: number; cashback_rate: number } | undefined;
  if (!offer) return null;

  // Apply tier bonus on top of base cashback rate
  const user = await dbGet('SELECT subscription_plan FROM users WHERE id = ?', [userId]) as { subscription_plan: string } | undefined;
  const plan = (user?.subscription_plan || 'free') as PlanKey;
  const tierBonus = PLANS[plan]?.cashbackBonus ?? 0;
  const effectiveRate = offer.cashback_rate + tierBonus;

  const cashbackAmount = computeCashbackAmount(purchaseAmount, effectiveRate);
  const result = await dbRun(
    'INSERT INTO cashback_transactions (user_id, offer_id, amount, status) VALUES (?, ?, ?, ?)',
    [userId, offerId, cashbackAmount, 'pending']
  );
  const transactionId = (result as { lastID: number }).lastID;
  await dbRun('UPDATE users SET total_earnings = total_earnings + ? WHERE id = ?', [cashbackAmount, userId]);
  createReferralEarning(userId, transactionId, cashbackAmount).catch(err => console.error('Error creating referral earning:', err));
  return { transactionId, cashbackAmount, tierBonus, effectiveRate };
}
