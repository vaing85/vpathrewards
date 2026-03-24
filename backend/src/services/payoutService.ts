import { dbAll, dbGet, dbRun } from '../database';
import { sendEmailToUser } from '../utils/emailService';
import { encrypt, safeDecrypt } from '../utils/encryption';

export const MIN_WITHDRAWAL_AMOUNT = 10.0;

function decryptWithdrawal<T extends { payment_details?: string }>(row: T): T {
  if (row?.payment_details) {
    return { ...row, payment_details: safeDecrypt(row.payment_details) };
  }
  return row;
}

export async function getWithdrawalHistory(userId: number) {
  const rows = await dbAll(
    `SELECT w.*, u.name as processed_by_name
     FROM withdrawals w
     LEFT JOIN users u ON w.processed_by = u.id
     WHERE w.user_id = ?
     ORDER BY w.requested_at DESC`,
    [userId]
  );
  return rows.map(decryptWithdrawal);
}

export async function getWithdrawalById(userId: number, withdrawalId: string | number) {
  const row = await dbGet(
    `SELECT w.*, u.name as processed_by_name
     FROM withdrawals w
     LEFT JOIN users u ON w.processed_by = u.id
     WHERE w.id = ? AND w.user_id = ?`,
    [withdrawalId, userId]
  );
  return row ? decryptWithdrawal(row) : undefined;
}

export async function getAvailableBalance(userId: number) {
  const user = await dbGet('SELECT total_earnings FROM users WHERE id = ?', [userId]) as { total_earnings: number } | undefined;
  const pending = await dbGet(
    `SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND status = 'pending'`,
    [userId]
  ) as { total: number } | undefined;
  const totalEarnings = user?.total_earnings ?? 0;
  const pendingWithdrawals = pending?.total ?? 0;
  const availableBalance = Math.max(0, totalEarnings - pendingWithdrawals);
  return {
    total_earnings: totalEarnings,
    pending_withdrawals: pendingWithdrawals,
    available_balance: availableBalance,
    min_withdrawal: MIN_WITHDRAWAL_AMOUNT,
    can_withdraw: availableBalance >= MIN_WITHDRAWAL_AMOUNT
  };
}

export interface CreateWithdrawalInput {
  amount: number;
  payment_method: string;
  payment_details: string;
}

export async function createWithdrawalRequest(userId: number, input: CreateWithdrawalInput) {
  const { amount, payment_method, payment_details } = input;

  const user = await dbGet('SELECT total_earnings, name, email FROM users WHERE id = ?', [userId]) as { total_earnings: number; name: string; email: string } | undefined;
  if (!user) return null;

  const pending = await dbGet(
    `SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND status = 'pending'`,
    [userId]
  ) as { total: number } | undefined;
  const availableBalance = (user.total_earnings ?? 0) - (pending?.total ?? 0);

  if (amount > availableBalance) return { error: 'insufficient_balance' };
  if (amount < MIN_WITHDRAWAL_AMOUNT) return { error: 'below_minimum' };

  // Encrypt payment_details before persisting
  const encryptedDetails = encrypt(payment_details);

  const result = await dbRun(
    'INSERT INTO withdrawals (user_id, amount, payment_method, payment_details, status) VALUES (?, ?, ?, ?, ?)',
    [userId, amount, payment_method, encryptedDetails, 'pending']
  );
  const withdrawalId = (result as { lastID: number }).lastID;
  const row = await dbGet('SELECT * FROM withdrawals WHERE id = ?', [withdrawalId]);
  const withdrawal = row ? decryptWithdrawal(row) : row;

  sendEmailToUser(
    userId,
    user.email,
    'withdrawalStatus',
    { name: user.name, amount, status: 'pending' },
    'withdrawal'
  ).catch(err => console.error('Failed to send withdrawal request email:', err));

  return { withdrawal };
}
