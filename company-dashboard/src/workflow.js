// Payment records are bookkeeping, not a transfer of funds.
export function paymentTotals(app, payments) {
  const records = payments.filter((p) => p.application_id === app.id);
  const paid = records
    .filter((p) => p.status === "paid")
    .reduce((n, p) => n + Number(p.amount), 0);
  const committed = Number(app.agreed_amount ?? app.proposed_price ?? 0);
  return {
    paid,
    committed,
    outstanding: Math.max(0, committed - paid),
    settled: committed > 0 && paid >= committed,
  };
}

export function searchesUsed(searches, plan, now = new Date()) {
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return searches.filter(
    (s) => plan === "free" || new Date(s.created_at).getTime() >= monthStart,
  ).length;
}

export function contentMatches(items, status) {
  return status === "all"
    ? items
    : items.filter((item) => item.status === status);
}
