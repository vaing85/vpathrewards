/**
 * Referral service: orchestration. DB reads/writes for referral earnings.
 * Uses referral.rules for pure bonus computation.
 */

import { dbGet, dbRun } from '../../database';
import { getReferralBonusFromCashback, getReferralBonusPercentage } from './referral.rules';

/**
 * Create a referral earning when a referred user earns cashback.
 * Call after inserting the cashback_transaction and updating user total_earnings.
 */
export async function createReferralEarning(
  referredUserId: number,
  transactionId: number,
  cashbackAmount: number
): Promise<void> {
  try {
    const referral = await dbGet(
      'SELECT referrer_id, referral_code FROM referral_relationships WHERE referred_id = ?',
      [referredUserId]
    ) as { referrer_id: number; referral_code: string } | undefined;

    if (!referral) return;

    const bonusAmount = getReferralBonusFromCashback(cashbackAmount);
    const bonusPercent = getReferralBonusPercentage();

    await dbRun(
      `INSERT INTO referral_earnings (referrer_id, referred_id, transaction_id, amount, bonus_percentage, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [referral.referrer_id, referredUserId, transactionId, bonusAmount, bonusPercent, 'pending']
    );
  } catch (error) {
    console.error('Error creating referral earning:', error);
  }
}

/**
 * Confirm referral earning when the linked cashback transaction is confirmed.
 * Updates status and adds the bonus to the referrer's total_earnings.
 */
export async function confirmReferralEarning(transactionId: number): Promise<void> {
  try {
    const referralEarning = await dbGet(
      'SELECT * FROM referral_earnings WHERE transaction_id = ? AND status = ?',
      [transactionId, 'pending']
    ) as { id: number; referrer_id: number; amount: number } | undefined;

    if (!referralEarning) return;

    await dbRun(
      'UPDATE referral_earnings SET status = ? WHERE id = ?',
      ['confirmed', referralEarning.id]
    );

    await dbRun(
      'UPDATE users SET total_earnings = total_earnings + ? WHERE id = ?',
      [referralEarning.amount, referralEarning.referrer_id]
    );
  } catch (error) {
    console.error('Error confirming referral earning:', error);
  }
}
