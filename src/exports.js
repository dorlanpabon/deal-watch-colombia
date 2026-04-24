import fs from "node:fs/promises";
import path from "node:path";

export async function exportDeals(deals, config) {
  const output = config.output ?? {};
  if (!output.enabled) return [];

  const formats = normalizeFormats(output.formats);
  if (formats.length === 0) return [];

  const dir = output.dir ?? "data/exports";
  await fs.mkdir(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `${config.profile ?? "deals"}-${stamp}`;
  const payload = buildPayload(deals, config);
  const written = [];

  if (formats.includes("json")) {
    const file = path.join(dir, `${baseName}.json`);
    await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    written.push(file);
  }

  if (formats.includes("txt") || formats.includes("ai")) {
    const file = path.join(dir, `${baseName}.txt`);
    await fs.writeFile(file, formatForAi(payload), "utf8");
    written.push(file);
  }

  for (const file of written) console.log(`[export] ${file}`);
  return written;
}

function normalizeFormats(value) {
  if (!value) return [];
  const formats = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(formats.map((format) => format.trim().toLowerCase()).filter(Boolean))]
    .filter((format) => ["json", "txt", "ai"].includes(format));
}

function buildPayload(deals, config) {
  return {
    generatedAt: new Date().toISOString(),
    profile: config.profile,
    queries: config.queries,
    criteria: config.criteria,
    count: deals.length,
    deals: deals.map((deal, index) => ({
      rank: index + 1,
      tag: deal.tag,
      source: deal.source,
      title: deal.title,
      url: deal.url,
      condition: deal.condition,
      price: deal.price,
      currency: deal.currency,
      landedCop: deal.cost.landedCop,
      shippingCop: deal.shippingCop,
      international: deal.international,
      specs: deal.specs,
      matchNotes: deal.match.reasons
    }))
  };
}

function formatForAi(payload) {
  const lines = [
    "Analiza estas ofertas y ordena las mejores por relacion precio/riesgo/especificaciones para Colombia.",
    `Perfil: ${payload.profile}`,
    `Generado: ${payload.generatedAt}`,
    `Consultas: ${payload.queries.join("; ")}`,
    `Resultados: ${payload.count}`,
    ""
  ];

  for (const deal of payload.deals) {
    lines.push(
      `#${deal.rank} ${deal.tag} | ${money(deal.landedCop)} COP puesto`,
      `Fuente: ${deal.source}`,
      `Titulo: ${deal.title}`,
      `Estado: ${deal.condition}`,
      `Precio base: ${money(deal.price)} ${deal.currency}`,
      `Specs detectadas: chip=${deal.specs.chip ?? "?"} tier=${deal.specs.chipTier ?? "?"} ram=${deal.specs.ramGb ?? "?"}GB`,
      `Internacional: ${deal.international ? "si" : "no"}`,
      `URL: ${deal.url}`,
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

function money(value) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);
}
