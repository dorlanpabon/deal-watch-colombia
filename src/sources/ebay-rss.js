import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

export async function searchEbayRss(query, config) {
  const source = config.sources.ebayRss;
  const url = new URL(`https://${source.site}/sch/i.html`);
  url.searchParams.set("_nkw", query);
  url.searchParams.set("_sop", "15");
  url.searchParams.set("_rss", "1");
  if (source.buyItNowOnly) url.searchParams.set("LH_BIN", "1");

  const res = await fetch(url, { headers: { accept: "application/rss+xml,text/xml" } });
  if (!res.ok) throw new Error(`ebay_${res.status}`);
  const xml = parser.parse(await res.text());
  const items = asArray(xml?.rss?.channel?.item);

  return items.slice(0, config.watch.maxResultsPerSource).map((item) => {
    const title = textOf(item.title);
    const description = textOf(item.description);
    return {
      source: "eBay",
      id: `ebay:${textOf(item.guid) || textOf(item.link)}`,
      title,
      description,
      url: cleanEbayUrl(textOf(item.link)),
      price: extractUsd(`${title} ${description}`),
      currency: "USD",
      condition: "unknown",
      international: true
    };
  }).filter((item) => Number.isFinite(item.price));
}

function extractUsd(text) {
  const match = String(text).match(/\$\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/);
  return match ? Number(match[1].replaceAll(",", "")) : Number.NaN;
}

function cleanEbayUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function textOf(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return value["#text"] ?? "";
  return String(value);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
