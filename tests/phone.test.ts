import { test } from "node:test";
import assert from "node:assert/strict";
import { maskPhone, normalizeCode, normalizeSaPhone } from "../lib/phone";

test("Saudi mobile formats normalise to +9665XXXXXXXX", () => {
  for (const v of ["0501234567", "501234567", "966501234567", "+966501234567", "+966 50 123 4567", "00966501234567", "05 0123 4567", "050-123-4567", "٠٥٠١٢٣٤٥٦٧", "+٩٦٦٥٠١٢٣٤٥٦٧"]) {
    assert.equal(normalizeSaPhone(v), "+966501234567", v);
  }
});
test("rejects non-mobile / foreign / malformed numbers", () => {
  for (const v of ["", "0112345678", "0401234567", "+971501234567", "05012345", "050123456789", "abc", "+966 5012 345 67 8", "0501234567; DROP"]) {
    assert.equal(normalizeSaPhone(v), null, v);
  }
});
test("code normalisation and masking", () => {
  assert.equal(normalizeCode("١٢٣ ٤٥٦"), "123456");
  assert.equal(normalizeCode("12-34 56"), "123456");
  assert.equal(maskPhone("+966501234567"), "+966 5X XXX X567");
});
