import { createMercadoLibreTools } from "@dan1d/mercadolibre-mcp";

export async function searchMercadoLibreMcp(query, config) {
  const source = config.sources.mercadolibreMcp;
  const ml = createMercadoLibreTools(process.env.MERCADOLIBRE_ACCESS_TOKEN);
  const data = await ml.tools.search_items({
    query,
    site_id: source.siteId,
    limit: config.watch.maxResultsPerSource
  });

  return (data.results ?? []).map((item) => ({
    source: "MercadoLibre MCP",
    id: `mcp:${item.id}`,
    title: item.title,
    url: item.permalink,
    price: item.price,
    currency: item.currency_id,
    condition: item.condition,
    shippingCop: item.shipping?.free_shipping ? 0 : undefined,
    international: false
  }));
}
