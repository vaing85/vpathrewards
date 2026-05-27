/**
 * Render an offer's user-facing cashback as either "5%" or "$10",
 * choosing flat-amount when cashback_fixed_usd is set (> 0). Used by
 * OfferCard, OfferDetail, SearchBar, the recommendation widget, etc.
 *
 * Backend invariant: cashback_rate is NOT NULL (often 0 for flat-only
 * offers) and cashback_fixed_usd is nullable. If both are > 0 we prefer
 * the flat amount in the headline display — admins are advised in the
 * admin UI not to mix them.
 */
export interface CashbackFields {
  cashback_rate?: number | null;
  cashback_fixed_usd?: number | null;
}

export function formatCashback(o: CashbackFields): string {
  const fixed = o.cashback_fixed_usd ?? 0;
  if (fixed > 0) {
    return `$${Number.isInteger(fixed) ? fixed : fixed.toFixed(2)}`;
  }
  const rate = o.cashback_rate ?? 0;
  return `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`;
}

/** "$10 cashback" or "5% cashback" — full label form. */
export function formatCashbackLabel(o: CashbackFields): string {
  return `${formatCashback(o)} cashback`;
}

/**
 * User-facing headline form: "Up to 5%" or "Up to $10".
 *
 * The raw cashback_rate / cashback_fixed_usd on an offer is the *commission*
 * VPathRewards earns from CJ. Users keep a tier-based share of (commission −
 * $5 platform fee), so the actual user payout varies from 20% (Bronze) to
 * 100% (Obsidian) of the remainder. We frame this as "Up to" to set expectation:
 *
 *   Diecast 10% offer  → "Up to 10%"  (Obsidian on a small/medium order)
 *   Sucuri $15 flat    → "Up to $15"  (sub-$5-fee-waiver case for small comms,
 *                                       Obsidian approaches it for large comms)
 *
 * For sub-$5 commissions the fee is waived entirely so the headline IS what
 * the user gets. For larger commissions the headline is an aspirational
 * ceiling — exactly how mainstream cashback sites label.
 */
export function formatHeadlineCashback(o: CashbackFields): string {
  return `Up to ${formatCashback(o)}`;
}

/** True if this offer pays a flat amount; useful for visual treatment. */
export function isFixedCashback(o: CashbackFields): boolean {
  return (o.cashback_fixed_usd ?? 0) > 0;
}
