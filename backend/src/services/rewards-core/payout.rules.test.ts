/**
 * Unit tests for computePayout (pure logic). Locks the user/platform split,
 * including the flat-rate bounty rule (no tier share, user keeps the whole
 * remainder after the flat fee). Rounding: cents. See ROUNDING.md.
 */
import test from 'node:test';
import assert from 'node:assert';
import { computePayout, PLATFORM_FEE_USD } from './calculations';

test('fee waived: commission <= fee → user gets all, platform gets 0', () => {
  for (const c of [0, 1, 4.99, PLATFORM_FEE_USD]) {
    const p = computePayout(c, 0.2);
    assert.strictEqual(p.userAmount, c);
    assert.strictEqual(p.platformAmount, 0);
    assert.strictEqual(p.platformFee, 0);
    assert.strictEqual(p.feeWaived, true);
  }
});

test('percentage offer > fee: remainder split by tier share', () => {
  // $100 commission, Gold (0.50): fee $5, remainder $95, user 50% = $47.50
  const p = computePayout(100, 0.5);
  assert.strictEqual(p.userAmount, 47.5);
  assert.strictEqual(p.platformAmount, 52.5);
  assert.strictEqual(p.platformFee, PLATFORM_FEE_USD);
  assert.strictEqual(p.feeWaived, false);

  // Bronze (0.20): user 20% of $95 = $19
  assert.strictEqual(computePayout(100, 0.2).userAmount, 19);
});

test('flat-rate offer > fee: user keeps the whole remainder after the fee', () => {
  // $209.79 bounty, Bronze (0.20) — tier share must be IGNORED for flat-rate.
  const p = computePayout(209.79, 0.2, { flatRate: true });
  assert.strictEqual(p.userAmount, 204.79); // 209.79 - 5
  assert.strictEqual(p.platformAmount, 5);
  assert.strictEqual(p.platformFee, PLATFORM_FEE_USD);
  assert.strictEqual(p.feeWaived, false);

  // Same regardless of tier — Obsidian (1.0) yields the same as Bronze.
  assert.strictEqual(computePayout(209.79, 1.0, { flatRate: true }).userAmount, 204.79);
});

test('flat-rate offer <= fee: user gets the whole small bounty', () => {
  const p = computePayout(5, 0.2, { flatRate: true });
  assert.strictEqual(p.userAmount, 5);
  assert.strictEqual(p.platformAmount, 0);
  assert.strictEqual(p.feeWaived, true);
});

test('negative commission clamps to zero', () => {
  const p = computePayout(-50, 0.5);
  assert.strictEqual(p.userAmount, 0);
  assert.strictEqual(p.platformAmount, 0);
});
