/**
 * Locks the flat-rate fee-subtraction behavior of the user-facing cashback
 * helpers. Adding cases here is the right way to prevent the "we showed
 * $25 but only paid $20" class of bug from regressing.
 */
import { describe, it, expect } from 'vitest';
import {
  effectiveFlatUsd,
  formatCashback,
  formatHeadlineCashback,
  formatCashbackLabel,
  isFixedCashback,
  PLATFORM_FEE_USD,
} from './cashback';

describe('effectiveFlatUsd', () => {
  it('subtracts the $5 platform fee for bounties above the fee', () => {
    expect(effectiveFlatUsd(25)).toBe(20);
    expect(effectiveFlatUsd(209.79)).toBeCloseTo(204.79, 2);
  });
  it('returns the full bounty when it is at or below the fee (fee waived)', () => {
    expect(effectiveFlatUsd(5)).toBe(5);
    expect(effectiveFlatUsd(3)).toBe(3);
    expect(effectiveFlatUsd(0)).toBe(0);
  });
  it('clamps negatives to 0', () => {
    expect(effectiveFlatUsd(-10)).toBe(0);
  });
  it('exports a PLATFORM_FEE_USD constant matching the subtraction', () => {
    expect(PLATFORM_FEE_USD).toBe(5);
    expect(effectiveFlatUsd(100)).toBe(100 - PLATFORM_FEE_USD);
  });
});

describe('formatCashback', () => {
  it('flat-rate: shows the net amount (gross − fee), not the gross', () => {
    expect(formatCashback({ cashback_fixed_usd: 25 })).toBe('$20');
    expect(formatCashback({ cashback_fixed_usd: 15 })).toBe('$10');
  });
  it('flat-rate at/below fee: shows the full bounty (fee waived)', () => {
    expect(formatCashback({ cashback_fixed_usd: 5 })).toBe('$5');
    expect(formatCashback({ cashback_fixed_usd: 3 })).toBe('$3');
  });
  it('percentage: shows the rate unchanged (fee is a separate $ amount)', () => {
    expect(formatCashback({ cashback_rate: 5 })).toBe('5%');
    expect(formatCashback({ cashback_rate: 4.5 })).toBe('4.5%');
  });
  it('prefers flat over rate when both are set', () => {
    expect(formatCashback({ cashback_fixed_usd: 25, cashback_rate: 3 })).toBe('$20');
  });
});

describe('formatHeadlineCashback', () => {
  it('flat-rate: exact dollar amount, no "Up to" hedge', () => {
    expect(formatHeadlineCashback({ cashback_fixed_usd: 25 })).toBe('$20');
  });
  it('percentage: "Up to X%" — gross rate is the ceiling that depends on tier', () => {
    expect(formatHeadlineCashback({ cashback_rate: 5 })).toBe('Up to 5%');
  });
});

describe('formatCashbackLabel & isFixedCashback', () => {
  it('appends " cashback" to the value', () => {
    expect(formatCashbackLabel({ cashback_fixed_usd: 25 })).toBe('$20 cashback');
    expect(formatCashbackLabel({ cashback_rate: 5 })).toBe('5% cashback');
  });
  it('isFixedCashback reflects the stored gross > 0, not the net', () => {
    expect(isFixedCashback({ cashback_fixed_usd: 25 })).toBe(true);
    expect(isFixedCashback({ cashback_fixed_usd: 0 })).toBe(false);
    expect(isFixedCashback({ cashback_rate: 5 })).toBe(false);
  });
});
