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

test("accepts MacBook Pro M4 Pro when official store hides RAM", () => {
  const result = matchesCriteria({ title: "MacBook Pro de 14 pulgadas: Chip M4 Pro de Apple, 512 GB SSD" }, criteria);
  assert.equal(result.ok, true);
  assert.equal(result.specs.ramGb, 24);
});

test("rejects base MacBook Pro M4 when official store hides RAM", () => {
  const result = matchesCriteria({ title: "MacBook Pro de 14 pulgadas: Chip M4 de Apple, 512 GB SSD" }, criteria);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes("ram_unknown"));
});

test("can include low or unknown RAM in relaxed analysis mode", () => {
  const relaxed = { ...criteria, minRamGb: 0, rejectUnknownRam: false };
  assert.equal(matchesCriteria({ title: "MacBook Pro M4 16GB 512GB" }, relaxed).ok, true);
  assert.equal(matchesCriteria({ title: "MacBook Pro de 14 pulgadas: Chip M4 de Apple, 512 GB SSD" }, relaxed).ok, true);
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

test("supports generic product criteria", () => {
  const result = matchesCriteria(
    { title: "iPhone 16 Pro Max 256GB" },
    {
      requiredTerms: ["iphone", "16"],
      chips: [],
      minRamGb: 0,
      requireMacBookPro: false,
      rejectUnknownRam: false,
      rejectTerms: []
    }
  );
  assert.equal(result.ok, true);
});
