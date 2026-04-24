import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateLandedCop } from "../src/costs.js";

const config = {
  costs: {
    internationalShippingCop: 200000,
    courierHandlingCop: 100000,
    importVatRate: 0.19,
    laptopDutyRate: 0,
    localShippingCop: 0
  }
};

test("estimates international landed cost", () => {
  const cost = estimateLandedCop({ price: 1000, currency: "USD", international: true }, config, 4000);
  assert.equal(cost.priceCop, 4000000);
  assert.equal(cost.shippingCop, 200000);
  assert.equal(cost.importCop, 798000);
  assert.equal(cost.handlingCop, 100000);
  assert.equal(cost.landedCop, 5098000);
});

test("keeps local listings without import cost", () => {
  const cost = estimateLandedCop({ price: 5000000, currency: "COP", international: false }, config, 4000);
  assert.equal(cost.landedCop, 5000000);
});
