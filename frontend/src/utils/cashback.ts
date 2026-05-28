/**
 * Render an offer's user-facing cashback as either "5%" or "$10",
 * choosing flat-amount when cashback_fixed_usd is set (> 0). Used by
 * OfferCard, OfferDetail, SearchBar, the recommendation widget, etc.
 *
 * Backend invariant: cashback_rate is NOT NULL (often 0 for flat-only
 * offers) and cashback_fixed_usd is nullable. If both are > 0 we prefer
 * the flat amount in the headline display — admins are advised in the
 * admin UI not to mix them.
 *
 * IMPORTANT — flat-rate offers:
 *   The stored cashback_fixed_usd is the *gross* bounty CJ pays us. The
 *   user actually receives gross − $5 (the platform fee), or the full
 *   gross if it's ≤ $5 (fee waived). All display helpers here subtract
 *   the fee so customers and admins see what the user really gets, not
 *   the gross. Conversion math (computePayout) still consumes the gross
 *   value — never display the gross directly except in admin diagnostics.
 */

/** Mirrors backend's rewards-core PLATFORM_FEE_USD constant. */
export const PLATFORM_FEE_USD = 5;

export interface CashbackFields {
  cashback_rate?: number | null;
  cashback_fixed_usd?: number | null;
}

/**
 * For a flat-rate offer, the dollar amount the user actually receives:
 * the gross bounty minus the $5 platform fee, or the full gross when the
 * gross is ≤ $5 (fee waived per computePayout).
 */
export function effectiveFlatUsd(grossFixed: number): number {
  if (grossFixed <= 0) return 0;
  return grossFixed <= PLATFORM_FEE_USD ? grossFixed : grossFixed - PLATFORM_FEE_USD;
}

function fmtMoney(n: number): string {
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

export function formatCashback(o: CashbackFields): string {
  const fixed = o.cashback_fixed_usd ?? 0;
  if (fixed > 0) return fmtMoney(effectiveFlatUsd(fixed));
  const rate = o.cashback_rate ?? 0;
  return `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`;
}

/** "$10 cashback" or "5% cashback" — full label form. */
export function formatCashbackLabel(o: CashbackFields): string {
  return `${formatCashback(o)} cashback`;
}

/**
 * User-facing headline form.
 *
 * For flat-rate offers, the user receives an exact amount (gross − $5, or
 * the full gross if ≤ $5), so the headline is "$X" with no hedge.
 *
 * For percentage offers the actual cashback depends on purchase size and
 * tier (Bronze 20% share → Obsidian 100% share of remainder after the $5
 * fee), so we frame it as "Up to X%" — the gross rate is the ceiling that
 * top-tier users approach on small purchases (where the fee is waived).
 */
export function formatHeadlineCashback(o: CashbackFields): string {
  if ((o.cashback_fixed_usd ?? 0) > 0) return formatCashback(o);
  return `Up to ${formatCashback(o)}`;
}

/** True if this offer pays a flat amount; useful for visual treatment. */
export function isFixedCashback(o: CashbackFields): boolean {
  return (o.cashback_fixed_usd ?? 0) > 0;
}
