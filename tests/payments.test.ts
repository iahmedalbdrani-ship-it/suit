import { test } from "node:test";
import assert from "node:assert/strict";
import { signCallback, verifyWebhook, safeEqual } from "../lib/payments/webhook";
import { computeQuote, quoteTotal } from "../lib/pricing";

const SECRET = "test-secret-123";
const PID = "pay_0123456789abcdef01234567";

test("webhook: valid signature is accepted", async () => {
  const sig = await signCallback(SECRET, PID);
  assert.deepEqual(await verifyWebhook(SECRET, PID, sig, { status: "paid" }), { ok: true });
});

test("webhook: missing, wrong or other-payment signature is rejected", async () => {
  const sig = await signCallback(SECRET, PID);
  assert.equal((await verifyWebhook(SECRET, PID, null, {})).ok, false);
  assert.equal((await verifyWebhook(SECRET, PID, "deadbeef", {})).ok, false);
  assert.equal((await verifyWebhook(SECRET, "pay_ffffffffffffffffffffffff", sig, {})).ok, false);
  assert.equal((await verifyWebhook("other-secret", PID, sig, {})).ok, false);
});

test("webhook: refuses everything when no secret is configured", async () => {
  const r = await verifyWebhook("", PID, "x", {});
  assert.deepEqual(r, { ok: false, reason: "not_configured" });
});

test("webhook: body secret_token must match when present", async () => {
  const sig = await signCallback(SECRET, PID);
  assert.equal((await verifyWebhook(SECRET, PID, sig, { secret_token: SECRET })).ok, true);
  assert.deepEqual(await verifyWebhook(SECRET, PID, sig, { secret_token: "nope" }), { ok: false, reason: "bad_secret_token" });
  assert.deepEqual(await verifyWebhook(SECRET, PID, sig, { secret_token: 5 }), { ok: false, reason: "bad_secret_token" });
});

test("safeEqual: constant-time compare semantics", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
});

test("pricing: recomputed total always equals computeQuote total", () => {
  const L = { base_price: 42000, weekend_price: 48000, cleaning_fee: 6000, weekly_discount: 10, monthly_discount: 20 };
  for (const rates of [{ serviceFeeRate: 0, vatRate: 0 }, { serviceFeeRate: 0.05, vatRate: 0.15 }]) {
    for (const [a, b] of [["2027-01-04", "2027-01-06"], ["2027-01-04", "2027-01-12"], ["2027-01-01", "2027-02-05"]]) {
      const q = computeQuote(L, a, b, new Map(), rates);
      assert.equal(quoteTotal(q), q.total);
    }
  }
});
