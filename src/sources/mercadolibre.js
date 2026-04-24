export async function searchMercadoLibre(query, config) {
  const url = new URL("https://api.mercadolibre.com/sites/MCO/search");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(config.watch.maxResultsPerSource));

  const headers = {
    accept: "application/json",
    "user-agent": "MacBookDealWatch/1.0"
  };
  if (process.env.MERCADOLIBRE_ACCESS_TOKEN) {
    headers.authorization = `Bearer ${process.env.MERCADOLIBRE_ACCESS_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const suffix = res.status === 403 && !process.env.MERCADOLIBRE_ACCESS_TOKEN
      ? "_token_required"
      : "";
    throw new Error(`mercadolibre_${res.status}${suffix}`);
  }
  const json = await res.json();

  return (json.results ?? []).map((item) => ({
    source: "MercadoLibre CO",
    id: `mco:${item.id}`,
    title: item.title,
    url: item.permalink,
    price: item.price,
    currency: item.currency_id,
    condition: item.condition,
    shippingCop: item.shipping?.free_shipping ? 0 : undefined,
    international: false
  }));
}
