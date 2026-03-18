/**
 * Unit tests for referral rules (pure logic). Lock getReferralBonusFromCashback behavior.
 * Rounding: all amounts to cents (round half away from zero). See ROUNDING.md.
 */
import test from 'node:test';
import assert from 'node:assert';
import { getReferralBonusFromCashback } from './referral.rules';
import { roundToCents, computeCashbackAmount, computeReferralBonus } from './calculations';

test('getReferralBonusFromCashback(100) equals 10 when bonus is 10%', () => {
  assert.strictEqual(getReferralBonusFromCashback(100), 10);
});

test('edge cases: 0, rounding to cents, negative', () => {
  assert.strictEqual(getReferralBonusFromCashback(0), 0);

  // Round to cents: 10% of 33.33 = 3.333 -> 3.33
  assert.strictEqual(getReferralBonusFromCashback(33.33), 3.33);

  // Round half up: 10% of 10.055 = 1.0055 -> 1.01
  assert.strictEqual(getReferralBonusFromCashback(10.055), 1.01);

  assert.strictEqual(getReferralBonusFromCashback(-100), 0);
});

test('roundToCents: half away from zero, no banker rounding', () => {
  assert.strictEqual(roundToCents(1.234), 1.23);
  assert.strictEqual(roundToCents(1.235), 1.24);
  assert.strictEqual(roundToCents(1.236), 1.24);
  assert.strictEqual(roundToCents(2.5), 2.5);
  // 1.005 can round to 1 in JS (float 1.005*100 !== 100.5); we lock the intended rule above
});

test('computeCashbackAmount and computeReferralBonus round to cents', () => {
  assert.strictEqual(computeCashbackAmount(99.99, 10), 10);
  assert.strictEqual(computeCashbackAmount(10.055, 10), 1.01);
  assert.strictEqual(computeReferralBonus(3.333, 10), 0.33);
});
