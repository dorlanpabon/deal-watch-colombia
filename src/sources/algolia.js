export async function searchAlgoliaSources(queries, config) {
  const sources = (config.sources.algolia ?? []).filter((source) => source.enabled);
  if (sources.length === 0) return [];

  const queryList = Array.isArray(queries) ? queries : [queries];
  const results = [];
  for (const source of sources) {
    for (const query of queryList) {
      results.push(...await searchAlgoliaSource(source, query, config));
    }
  }
  return dedupe(results);
}

async function searchAlgoliaSource(source, query, config) {
  const endpoint = `https://${source.appId}-dsn.algolia.net/1/indexes/*/queries`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-algolia-application-id": source.appId,
      "x-algolia-api-key": source.apiKey,
      "user-agent": "DealWatchColombia/1.0"
    },
    body: JSON.stringify({
      requests: [{
        indexName: source.indexName,
        analytics: false,
        clickAnalytics: false,
        facets: ["*"],
        hitsPerPage: config.watch.maxResultsPerSource,
        maxValuesPerFacet: 500,
        page: 0,
        query,
        removeWordsIfNoResults: "allOptional",
        userToken: "deal-watch-colombia"
      }]
    })
  });
  if (!res.ok) throw new Error(`${source.name}_${res.status}`);

  const json = await res.json();
  const hits = json?.results?.[0]?.hits ?? [];
  return hits.map((hit) => toListing(hit, source)).filter((item) => item.title && Number.isFinite(item.price));
}

function toListing(hit, source) {
  const code = hit.code_string ?? hit.objectID;
  const url = hit.url_es_string ? new URL(hit.url_es_string, source.baseUrl).toString() : source.baseUrl;
  const price = Number(hit.pricevalue_cop_double ?? hit.lowestprice_double ?? hit.baseprice_cop_string);
  const ram = Array.isArray(hit["memoria-ram_string_mv"]) ? hit["memoria-ram_string_mv"].join(" ") : "";
  const disk = Array.isArray(hit["capacidad-disco_string_mv"]) ? hit["capacidad-disco_string_mv"].join(" ") : "";

  return {
    source: source.name,
    id: `${source.name}:${code}`,
    title: hit.name_text_es ?? hit.name_text ?? "",
    description: [hit.name_text_es, ram, disk].filter(Boolean).join(" "),
    url,
    price,
    currency: source.currency ?? "COP",
    condition: hit.stocklevelstatus_string ?? "unknown",
    international: false
  };
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
