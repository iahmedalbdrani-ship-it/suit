import { test } from "node:test";
import assert from "node:assert/strict";
import { fmt } from "../lib/i18n/config";

const apt = "{n?one=شقة واحدة;two=شقتان;few=# شقق;many=# شقة;other=# شقة}";

test("Arabic plural forms", () => {
  assert.equal(fmt(apt, { n: 1 }), "شقة واحدة");
  assert.equal(fmt(apt, { n: 2 }), "شقتان");
  assert.equal(fmt(apt, { n: 4 }), "4 شقق");
  assert.equal(fmt(apt, { n: 16 }), "16 شقة");
  assert.equal(fmt("{total} لـ {n?one=ليلة;few=# ليالٍ;other=# ليلة}", { total: "10", n: 3 }), "10 لـ 3 ليالٍ");
});
test("plain placeholders still work", () => {
  assert.equal(fmt("{a} و {b}", { a: 1, b: "x" }), "1 و x");
});
