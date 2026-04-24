import * as cheerio from "cheerio";

export async function searchHtmlSources(query, config) {
  const sources = config.sources.html.filter((source) => source.enabled);
  const batches = await Promise.allSettled(sources.map((source) => searchHtmlSource(source, query)));
  return batches.flatMap((batch) => batch.status === "fulfilled" ? batch.value : []);
}

async function searchHtmlSource(source, query) {
  const url = source.searchUrl.replace("{query}", encodeURIComponent(query));
  const res = await fetch(url, {
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0 MacBookDealWatch/1.0"
    }
  });
  if (!res.ok) throw new Error(`${source.name}_${res.status}`);

  const $ = cheerio.load(await res.text());
  return $(source.itemSelector).toArray().map((node, index) => {
    const item = $(node);
    const title = item.find(source.titleSelector).first().text().trim();
    const priceText = item.find(source.priceSelector).first().text().trim();
    const href = item.find(source.urlSelector).first().attr("href") ?? "";

    return {
      source: source.name,
      id: `${source.name}:${href || title || index}`,
      title,
      url: absoluteUrl(href, source.baseUrl),
      price: parsePrice(priceText),
      currency: source.currency ?? "COP",
      condition: source.condition ?? "unknown",
      international: Boolean(source.international)
    };
  }).filter((item) => item.title && Number.isFinite(item.price));
}

function parsePrice(value) {
  const text = String(value);
  const matches = [...text.matchAll(/\$?\s*([0-9][0-9.,\s\u00a0\u202f]*)/g)]
    .map((match) => match[1])
    .filter((match) => /\d/.test(match));
  const picked = /current price|precio actual|precio de oferta|oferta|sale|off/i.test(text)
    ? matches.at(-1)
    : matches[0];
  return picked ? parseLocaleNumber(picked) : Number.NaN;
}

function parseLocaleNumber(value) {
  const raw = String(value).replace(/[\s\u00a0\u202f]/g, "");
  if (raw.includes(",") && raw.includes(".")) {
    return Number(raw.lastIndexOf(".") > raw.lastIndexOf(",")
      ? raw.replaceAll(",", "")
      : raw.replaceAll(".", "").replace(",", "."));
  }
  if (raw.includes(",") && raw.split(",").at(-1).length === 2) {
    return Number(raw.replaceAll(".", "").replace(",", "."));
  }
  if (raw.includes(".") && raw.split(".").at(-1).length === 2) {
    return Number(raw.replaceAll(",", ""));
  }
  return Number(raw.replaceAll(",", "").replaceAll(".", ""));
}

function absoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}
