import * as cheerio from "cheerio";

export async function searchJsonLdProductSources(queries, config) {
  const sources = (config.sources.jsonLdProducts ?? []).filter((source) => source.enabled);
  if (sources.length === 0) return [];

  const results = [];
  for (const source of sources) {
    try {
      results.push(...await searchJsonLdProductSource(source, config));
    } catch (err) {
      if (process.env.SHOW_SOURCE_ERRORS !== "0") console.error(`[source-error] ${source.name}: ${err.message}`);
    }
  }

  return dedupe(results).filter((item) => matchesAnchorTerm(item, queries, config.criteria));
}

async function searchJsonLdProductSource(source, config) {
  const urls = source.urls?.length ? source.urls : await collectProductUrls(source);
  const limited = urls.slice(0, source.limit ?? config.watch.maxResultsPerSource);
  const products = [];
  for (const url of limited) {
    const listing = await fetchProduct(source, url);
    if (listing) products.push(listing);
    await sleep(source.requestDelayMs ?? 150);
  }
  return products;
}

async function collectProductUrls(source) {
  const res = await fetch(source.listUrl, {
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0 DealWatchColombia/1.0"
    }
  });
  if (!res.ok) throw new Error(`${source.name}_list_${res.status}`);

  const $ = cheerio.load(await res.text());
  const urls = [];
  for (const node of $("script[type='application/ld+json']").toArray()) {
    for (const item of asArray(safeJson($(node).text())?.itemListElement)) {
      const url = item?.url ?? item?.item?.url;
      if (url) urls.push(new URL(url, source.baseUrl).toString());
    }
  }
  if (source.linkSelector) {
    $(source.linkSelector).each((_, node) => {
      const href = $(node).attr("href");
      if (href) urls.push(new URL(href, source.baseUrl).toString());
    });
  }
  return [...new Set(urls)];
}

async function fetchProduct(source, url) {
  const res = await fetch(url, {
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0 DealWatchColombia/1.0"
    }
  });
  if (!res.ok) return null;

  const $ = cheerio.load(await res.text());
  for (const node of $("script[type='application/ld+json']").toArray()) {
    const product = findProduct(safeJson($(node).text()));
    if (product) return toListing(product, source, url);
  }
  return null;
}

function toListing(product, source, fallbackUrl) {
  const offer = asArray(product.offers)[0] ?? product.offers ?? {};
  const price = Number(String(offer.price ?? product.price ?? "").replace(/[^\d.]/g, ""));
  return {
    source: source.name,
    id: `${source.name}:${product.sku ?? product.mpn ?? product.url ?? fallbackUrl}`,
    title: String(product.name ?? ""),
    description: stripHtml(product.description),
    url: offer.url ?? product.url ?? fallbackUrl,
    price,
    currency: offer.priceCurrency ?? source.currency ?? "COP",
    condition: source.condition ?? conditionFromSchema(offer.itemCondition),
    shippingCop: Number(offer.shippingDetails?.shippingRate?.value ?? source.shippingCop ?? 0),
    international: Boolean(source.international)
  };
}

function findProduct(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(findProduct).find(Boolean) ?? null;
  if (value["@type"] === "Product" || asArray(value["@type"]).includes("Product")) return value;
  if (value["@graph"]) return findProduct(value["@graph"]);
  return null;
}

function conditionFromSchema(value) {
  if (/used/i.test(String(value))) return "used";
  if (/new/i.test(String(value))) return "new";
  return "unknown";
}

function matchesAnchorTerm(item, queries, criteria) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const requiredTerms = (criteria?.requiredTerms ?? []).map((term) => String(term).toLowerCase()).filter(Boolean);
  const queryAnchors = (Array.isArray(queries) ? queries : [queries])
    .map((query) => String(query).toLowerCase().split(/\s+/).find(Boolean))
    .filter(Boolean);
  return [...requiredTerms, ...queryAnchors].some((term) => text.includes(term));
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
