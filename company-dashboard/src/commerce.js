// Amounts in paise. Never accept browser totals as payment authorisation.
export function quotePackage(creatorPaise, quantity = 1) {
  if (!Number.isSafeInteger(creatorPaise) || creatorPaise < 10000 || creatorPaise > 1000000000) throw new Error('Invalid creator amount');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) throw new Error('Invalid quantity');
  const fee = Math.round(creatorPaise / 10);
  return { creator: creatorPaise * quantity, creatorFee: fee * quantity, companyFee: fee * quantity,
    packageTotal: (creatorPaise + fee) * quantity, subtotal: (creatorPaise + fee * 2) * quantity };
}
export function safeMediaUrl(input) {
  try { const url = new URL(input); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export const SEARCH_PLANS = Object.freeze({
  basic: { name: 'AI Basic', amount: 29900, searches: 10 },
  elevate: { name: 'Elevate', amount: 49900, searches: 30 },
  pro: { name: 'Pro', amount: 99900, searches: 100 },
});
