import { alertDeals } from "./alerts.js";
import { matchesCriteria } from "./criteria.js";
import { estimateLandedCop, getUsdToCop } from "./costs.js";
import { appendDeals, loadSeen, saveSeen } from "./persistence.js";
import { searchBrowserSources } from "./sources/browser.js";
import { searchEbayRss } from "./sources/ebay-rss.js";
import { searchHtmlSources } from "./sources/html.js";
import { searchMercadoLibre } from "./sources/mercadolibre.js";
import { searchMercadoLibreMcp } from "./sources/mercadolibre-mcp.js";
import { searchPatchrightBrowserSources } from "./sources/patchright-browser.js";
import { searchShopifySuggestSources } from "./sources/shopify-suggest.js";

export async function searchOnce(config, { onlyNew = false } = {}) {
  const usdToCop = await getUsdToCop(config);
  const seen = onlyNew ? await loadSeen() : new Set();
  const raw = await collectListings(config);
  const deals = raw
    .map((listing) => enrich(listing, config, usdToCop))
    .filter((listing) => listing.match.ok)
    .filter((listing) => passesTrustFilters(listing, config.criteria))
    .filter((listing) => listing.cost.landedCop >= config.criteria.minLandedCop)
    .filter((listing) => listing.cost.landedCop <= config.criteria.maxLandedCop)
    .filter((listing) => !seen.has(listing.id))
    .sort((a, b) => a.cost.landedCop - b.cost.landedCop);

  for (const deal of deals) seen.add(deal.id);
  if (onlyNew) await saveSeen(seen);
  await appendDeals(deals);
  await alertDeals(deals);

  return deals;
}

export async function watch(config) {
  for (;;) {
    await searchOnce(config, { onlyNew: true });
    await sleep(config.watch.intervalMinutes * 60_000);
  }
}

async function collectListings(config) {
  const tasks = [];
  if (config.sources.browser?.enabled) tasks.push(searchBrowserSources(config.queries, config));
  if (config.sources.patchrightBrowser?.enabled) tasks.push(searchPatchrightBrowserSources(config.queries, config));

  for (const query of config.queries) {
    if (config.sources.mercadolibre.enabled) tasks.push(searchMercadoLibre(query, config));
    if (config.sources.mercadolibreMcp?.enabled) tasks.push(searchMercadoLibreMcp(query, config));
    if (config.sources.ebayRss.enabled) tasks.push(searchEbayRss(query, config));
    tasks.push(searchShopifySuggestSources(query, config));
    tasks.push(searchHtmlSources(query, config));
  }

  const batches = await Promise.allSettled(tasks);
  const listings = [];
  const errors = new Set();
  for (const batch of batches) {
    if (batch.status === "fulfilled") {
      listings.push(...batch.value);
    } else if (process.env.SHOW_SOURCE_ERRORS !== "0") {
      errors.add(batch.reason.message);
    }
  }
  for (const error of errors) console.error(`[source-error] ${error}`);
  return dedupe(listings);
}

function enrich(listing, config, usdToCop) {
  const match = matchesCriteria(listing, config.criteria);
  const cost = estimateLandedCop(listing, config, usdToCop);
  return {
    ...listing,
    specs: match.specs,
    match,
    cost,
    tag: cost.landedCop <= config.criteria.greatDealCop ? "GANGA" : "OFERTA"
  };
}

function dedupe(listings) {
  const seen = new Set();
  return listings.filter((listing) => {
    const key = listing.url || listing.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function passesTrustFilters(listing, criteria) {
  if (listing.seller?.feedbackCount !== null && listing.seller?.feedbackCount < criteria.minSellerFeedback) {
    return false;
  }
  if (listing.seller?.positivePct !== null && listing.seller?.positivePct < criteria.minSellerPositivePct) {
    return false;
  }
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
