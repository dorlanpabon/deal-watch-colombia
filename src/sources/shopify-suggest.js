export async function searchShopifySuggestSources(query, config) {
  const sources = (config.sources.shopifySuggest ?? []).filter((source) => source.enabled);
  const batches = await Promise.allSettled(sources.map((source) => searchShopifySuggestSource(source, query, config)));
  return batches.flatMap((batch) => batch.status === "fulfilled" ? batch.value : []);
}

async function searchShopifySuggestSource(source, query, config) {
  const variants = queryVariants(query);
  const batches = await Promise.all(variants.map((variant) => fetchShopifySuggest(source, variant, config)));
  return dedupe(batches.flat());
}

async function fetchShopifySuggest(source, query, config) {
  const url = new URL("/search/suggest.json", source.baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("resources[type]", "product");
  url.searchParams.set("resources[limit]", String(config.watch.maxResultsPerSource));

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "MacBookDealWatch/1.0"
    }
  });
  if (!res.ok) throw new Error(`${source.name}_${res.status}`);

  const json = await res.json();
  const products = json?.resources?.results?.products ?? [];
  return products.map((product) => ({
    source: source.name,
    id: `${source.name}:${product.id}`,
    title: product.title,
    description: product.body,
    url: new URL(`/products/${product.handle}`, source.baseUrl).toString(),
    price: Number(product.price_min ?? product.price),
    currency: "COP",
    condition: product.available ? "available" : "unavailable",
    shippingCop: undefined,
    international: false
  })).filter((item) => Number.isFinite(item.price));
}

function queryVariants(query) {
  const strippedRam = query.replace(/\b(?:18|24|32|36|48|64|96|128)\s*GB\b/gi, "").replace(/\s+/g, " ").trim();
  return [...new Set([query, strippedRam].filter(Boolean))];
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
