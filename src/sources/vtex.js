export async function searchVtexSources(queries, config) {
  const sources = (config.sources.vtex ?? []).filter((source) => source.enabled);
  if (sources.length === 0) return [];

  const queryList = Array.isArray(queries) ? queries : [queries];
  const results = [];
  for (const source of sources) {
    for (const query of queryList) {
      results.push(...await searchVtexSource(source, query, config));
    }
  }
  return dedupe(results);
}

async function searchVtexSource(source, query, config) {
  const url = source.searchUrl.replace("{query}", encodeURIComponent(query));
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "DealWatchColombia/1.0"
    }
  });
  if (!res.ok && res.status !== 206) throw new Error(`${source.name}_${res.status}`);

  const products = await res.json();
  return products
    .slice(0, config.watch.maxResultsPerSource)
    .map((product) => toListing(product, source))
    .filter((item) => item.title && item.url && Number.isFinite(item.price));
}

function toListing(product, source) {
  const offer = firstOffer(product);
  const price = Number(offer?.Price ?? offer?.spotPrice ?? offer?.ListPrice);
  const available = Number(offer?.AvailableQuantity ?? 0) > 0;

  return {
    source: source.name,
    id: `${source.name}:${product.productId ?? product.productReference ?? product.linkText}`,
    title: product.productName ?? product.productTitle ?? "",
    description: [
      product.description,
      product.metaTagDescription,
      ...(product.items ?? []).map((item) => item.nameComplete ?? item.name)
    ].filter(Boolean).join(" "),
    url: product.link ?? new URL(`/${product.linkText}/p`, source.baseUrl).toString(),
    price,
    currency: source.currency ?? "COP",
    condition: available ? "available" : "unavailable",
    international: false
  };
}

function firstOffer(product) {
  for (const item of product.items ?? []) {
    for (const seller of item.sellers ?? []) {
      const offer = seller.commertialOffer;
      if (offer?.Price || offer?.ListPrice) return offer;
    }
  }
  return null;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.url || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
