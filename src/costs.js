const RATE_URL = "https://open.er-api.com/v6/latest/USD";

export async function getUsdToCop(config) {
  try {
    const res = await fetch(RATE_URL, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`fx_${res.status}`);
    const json = await res.json();
    const rate = Number(json?.rates?.COP);
    return Number.isFinite(rate) ? rate : config.costs.usdToCopFallback;
  } catch {
    return config.costs.usdToCopFallback;
  }
}

export function estimateLandedCop(listing, config, usdToCop) {
  const priceCop = toCop(listing.price, listing.currency, usdToCop);
  const shippingCop = listing.shippingCop ?? (listing.international
    ? config.costs.internationalShippingCop
    : config.costs.localShippingCop);
  const customsBase = priceCop + shippingCop;
  const importCop = listing.international
    ? Math.round(customsBase * (config.costs.importVatRate + config.costs.laptopDutyRate))
    : 0;
  const handlingCop = listing.international ? config.costs.courierHandlingCop : 0;

  return {
    priceCop,
    shippingCop,
    importCop,
    handlingCop,
    landedCop: priceCop + shippingCop + importCop + handlingCop
  };
}

export function toCop(amount, currency, usdToCop) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY;
  if (currency === "COP") return Math.round(value);
  if (currency === "USD") return Math.round(value * usdToCop);
  return Number.POSITIVE_INFINITY;
}
