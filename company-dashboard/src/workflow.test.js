import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentTotals, searchesUsed, contentMatches } from "./workflow.js";

test("partial payment is not a settled collaboration; pending records do not count as paid", () => {
  const app = { id: "a", agreed_amount: 3000 };
  const payments = [
    { application_id: "a", status: "paid", amount: 1000 },
    { application_id: "a", status: "pending", amount: 2000 },
    { application_id: "b", status: "paid", amount: 5000 },
  ];
  assert.deepEqual(paymentTotals(app, payments), {
    paid: 1000,
    committed: 3000,
    outstanding: 2000,
    settled: false,
  });
  payments[1].status = "paid";
  assert.equal(paymentTotals(app, payments).settled, true);
});
test("zero or missing rates never appear as settled", () => {
  assert.equal(paymentTotals({ id: "a" }, []).settled, false);
});
test("search counter respects UTC billing month and year", () => {
  const searches = [
    { created_at: "2025-09-20T00:00:00Z" },
    { created_at: "2026-08-31T23:59:59Z" },
    { created_at: "2026-09-01T00:00:00Z" },
  ];
  const now = new Date("2026-09-14T12:00:00Z");
  assert.equal(searchesUsed(searches, "pro", now), 1);
  assert.equal(searchesUsed(searches, "free", now), 3);
});
test("content filters show only selected delivery stage", () => {
  const content = ["submitted", "approved", "revision", "published"].map(
    (status) => ({ status }),
  );
  assert.equal(contentMatches(content, "all").length, 4);
  assert.deepEqual(contentMatches(content, "published"), [
    { status: "published" },
  ]);
});
