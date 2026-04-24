import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesCriteria } from "../src/criteria.js";

const criteria = {
  minRamGb: 18,
  chips: ["M4", "M5"],
  requireMacBookPro: true,
  rejectUnknownRam: true,
  rejectTerms: ["parts only", "cannot activate", "empty box"]
};

test("accepts MacBook Pro M4 with enough RAM", () => {
  const result = matchesCriteria({ title: "Apple MacBook Pro M4 Pro 24GB 512GB" }, criteria);
  assert.equal(result.ok, true);
  assert.equal(result.specs.ramGb, 24);
  assert.equal(result.specs.chip, "M4");
});

test("rejects MacBook Air", () => {
  const result = matchesCriteria({ title: "Apple MacBook Air M4 24GB" }, criteria);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes("not_macbook_pro"));
});

test("rejects low RAM", () => {
  const result = matchesCriteria({ title: "Apple MacBook Pro M4 16GB" }, criteria);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes("ram_low"));
});

test("rejects broken listings", () => {
  const result = matchesCriteria({ title: "MacBook Pro M4 24GB parts only" }, criteria);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes("reject_term"));
});

test("rejects empty boxes", () => {
  const result = matchesCriteria({ title: "EMPTY BOX MacBook Pro M5 24GB" }, criteria);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes("reject_term"));
});
