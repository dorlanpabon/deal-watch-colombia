import * as cheerio from "cheerio";

const detailCache = new Map();

export async function searchShopifySuggestSources(query, config) {
  const queries = Array.isArray(query) ? query : [query];
  const sources = (config.sources.shopifySuggest ?? []).filter((source) => source.enabled);
  const results = [];
  for (const source of sources) {
    try {
      results.push(...await searchShopifySuggestSource(source, queries, config));
    } catch (err) {
      if (process.env.SHOW_SOURCE_ERRORS !== "0") console.error(`[source-error] ${source.name}: ${err.message}`);
    }
  }
  return results;
}

async function searchShopifySuggestSource(source, queries, config) {
  const products = [];
  for (const query of queries) {
    for (const variant of queryVariants(query)) {
      products.push(...await fetchShopifySuggest(source, variant, config));
      await sleep(source.requestDelayMs ?? 300);
    }
  }
  const deduped = dedupe(products);
  if (source.hydrateProductPage === false || !config.criteria?.minRamGb) return deduped;
  return hydrateProducts(deduped, source);
}

async function fetchShopifySuggest(source, query, config) {
  const url = new URL("/search/suggest.json", source.baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("resources[type]", "product");
  url.searchParams.set("resources[limit]", String(config.watch.maxResultsPerSource));

  const res = await fetchWithRetry(url);
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

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "MacBookDealWatch/1.0"
      }
    });
    if (res.status !== 429 || attempt === 1) return res;
    await sleep(1_500);
  }
}

async function hydrateProducts(products, source) {
  const hydrated = [];
  for (const product of products) {
    if (!shouldHydrateProduct(product)) {
      hydrated.push(product);
      continue;
    }
    hydrated.push(await hydrateProductDetails(product));
    await sleep(source.hydrateDelayMs ?? 350);
  }
  return hydrated;
}

async function hydrateProductDetails(product) {
  if (detailCache.has(product.url)) return detailCache.get(product.url);

  const res = await fetch(product.url, {
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0 MacBookDealWatch/1.0"
    }
  });
  if (!res.ok) return product;

  const details = extractSelectedOptions(await res.text());
  if (!details) return product;
  const hydrated = {
    ...product,
    description: `${product.description ?? ""} ${details}`.trim()
  };
  detailCache.set(product.url, hydrated);
  return hydrated;
}

function shouldHydrateProduct(product) {
  const text = `${product.title} ${product.description ?? ""}`;
  if (/\b(?:8|16|18|24|32|36|48|64|96|128)\s*(?:GB|G)\b/i.test(text)) return false;
  if (/\bMacBook\s+Pro\b/i.test(text) && /\bM[45]\s*(?:Pro|Max|Ultra)\b/i.test(text)) return false;
  return true;
}

function extractSelectedOptions(html) {
  const $ = cheerio.load(html);
  const options = [];
  $("fieldset").each((_, node) => {
    const field = $(node);
    const label = field.find("legend").first().text().trim();
    const value = field.find("input[checked]").first().attr("value");
    if (label && value) options.push(`${label}: ${value}`);
  });
  return options.join(" ");
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
