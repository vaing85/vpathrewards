# Rewards rounding rules

All **cashback** and **referral bonus** amounts are rounded to **cents** (2 decimal places) before being stored or displayed. This avoids floating-point noise and keeps user-facing numbers consistent.

## Method: round half away from zero

We use **round half away from zero** (JavaScript `Math.round` on cents):

- `roundToCents(x) = Math.round(x * 100) / 100`
- Examples: `1.234` → `1.23`, `1.235` → `1.24`, `1.236` → `1.24`
- Negative (if ever allowed): `-1.235` → `-1.24`

This is applied in **one place only**: the pure math in `calculations.ts` (`roundToCents`, `computeCashbackAmount`, `computeReferralBonus`). Every cashback and referral bonus flows through these functions, so behavior is consistent and test-locked.

## Why not banker's rounding?

**Banker's rounding** (round half to even, e.g. 2.5 → 2, 3.5 → 4) reduces cumulative bias in large datasets and is common in accounting. We did not choose it because:

1. **Predictability for users** – “Half rounds up” is what most people expect when they see a cashback total.
2. **Simplicity** – No extra dependency or custom logic; `Math.round(x * 100) / 100` is standard and auditable.
3. **Volume** – If we later process very high volume and see systematic drift, we can revisit and document a switch to half-even in this file and in tests.

## Where it’s used

- **Cashback:** `cashbackService.trackCashback` and tracking conversion flows use `computeCashbackAmount(purchaseAmount, rate)` → result is already rounded to cents.
- **Referral bonus:** `getReferralBonusFromCashback(cashbackAmount)` uses `computeReferralBonus`, which rounds to cents, so the referrer’s bonus is always in cents.

Do not round again in routes, services, or DB layer. Rounding lives only in `calculations.ts` and is locked by unit tests.

## Float edge cases

In JavaScript, `1.005 * 100` is not exactly `100.5`, so `Math.round(1.005 * 100) / 100` can yield `1` instead of `1.01`. We accept this: the rule is still “round half away from zero to cents,” and the test suite locks the main cases (e.g. 1.234→1.23, 1.235→1.24). If we ever need strict decimal behavior for every possible input, we’d switch to integer-cents (store cents as integers) or a decimal library and document it here.
