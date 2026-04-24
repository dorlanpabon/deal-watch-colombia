import * as cheerio from "cheerio";

export async function searchWooCommerceSources(queries, config) {
  const sources = (config.sources.woocommerce ?? []).filter((source) => source.enabled);
  if (sources.length === 0) return [];

  const queryList = Array.isArray(queries) ? queries : [queries];
  const results = [];
  for (const source of sources) {
    const sourceQueries = source.queries ?? queryList;
    for (const query of sourceQueries) {
      try {
        results.push(...await searchWooCommerceSource(source, query, config));
      } catch (err) {
        if (process.env.SHOW_SOURCE_ERRORS !== "0") console.error(`[source-error] ${source.name}: ${err.message}`);
      }
    }
  }
  return dedupe(results);
}

async function searchWooCommerceSource(source, query, config) {
  const url = new URL(source.endpoint ?? "/wp-json/wc/store/v1/products", source.baseUrl);
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", String(source.limit ?? config.watch.maxResultsPerSource));

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "DealWatchColombia/1.0"
    }
  });
  if (!res.ok) throw new Error(`${source.name}_${res.status}`);

  const products = await res.json();
  if (!Array.isArray(products)) return [];

  return products
    .slice(0, config.watch.maxResultsPerSource)
    .map((product) => toListing(product, source))
    .filter((item) => item.title && item.url && Number.isFinite(item.price));
}

function toListing(product, source) {
  const priceInfo = product.prices ?? {};
  const price = parsePrice(priceInfo.price ?? priceInfo.sale_price ?? priceInfo.regular_price, priceInfo.currency_minor_unit);
  const categories = (product.categories ?? []).map((category) => category.name).filter(Boolean);
  const description = [
    stripHtml(product.short_description),
    stripHtml(product.description),
    ...categories
  ].filter(Boolean).join(" ");

  return {
    source: source.name,
    id: `${source.name}:${product.id ?? product.permalink ?? product.name}`,
    title: stripHtml(product.name),
    description,
    url: product.permalink ?? new URL(product.slug ?? "", source.baseUrl).toString(),
    price,
    currency: priceInfo.currency_code ?? source.currency ?? "COP",
    condition: source.condition ?? (product.is_in_stock ? "available" : "unavailable"),
    international: Boolean(source.international)
  };
}

function parsePrice(value, minorUnit = 0) {
  if (value === null || value === undefined || value === "") return Number.NaN;
  const amount = Number(String(value).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount)) return Number.NaN;
  return minorUnit > 0 ? amount / (10 ** Number(minorUnit)) : amount;
}

function stripHtml(value) {
  return cheerio.load(String(value ?? "")).text().replace(/\s+/g, " ").trim();
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
