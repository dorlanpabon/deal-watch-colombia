#!/usr/bin/env node
import "dotenv/config";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { loadConfig } from "./config.js";
import { searchOnce, watch } from "./runner.js";

const { command, options } = parseArgs(process.argv.slice(2));
const config = applyCliOptions(await loadConfig(options.config), options);

if (command === "search") {
  await promptSearchConfig(config, options);
  await searchOnce(config);
} else if (command === "watch") {
  await watch(config);
} else {
  console.error("use: deal-watch search|watch [--config config.json] [--query text] [--max-landed-cop n]");
  process.exitCode = 1;
}

function parseArgs(args) {
  const options = {};
  const rest = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      rest.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const value = inlineValue ?? (args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true);
    if (key === "query") {
      options.queries = [...(options.queries ?? []), value];
    } else {
      options[key] = value;
    }
  }

  return { command: rest[0] ?? "search", options };
}

function applyCliOptions(config, options) {
  if (options.strictSpecs) applyStrictSpecs(config);
  if (options.looseSpecs) applyLooseSpecs(config);
  if (options.queries?.length) {
    applyQueryProfile(config, options.queries, {
      keepRequiredTerms: Object.hasOwn(options, "requiredTerm")
    });
  }
  if (options.minRamGb) config.criteria.minRamGb = Number(options.minRamGb);
  if (options.preferredMinRamGb) config.criteria.preferredMinRamGb = Number(options.preferredMinRamGb);
  if (options.maxLandedCop) config.criteria.maxLandedCop = Number(options.maxLandedCop);
  if (options.minLandedCop) config.criteria.minLandedCop = Number(options.minLandedCop);
  if (options.greatDealCop) config.criteria.greatDealCop = Number(options.greatDealCop);
  if (Object.hasOwn(options, "export")) {
    const value = options.export === true ? "txt" : options.export;
    config.output = {
      ...(config.output ?? {}),
      enabled: String(value).toLowerCase() !== "none",
      formats: String(value).toLowerCase() === "all" ? ["json", "txt"] : String(value).split(",")
    };
  }
  if (options.outputDir) {
    config.output = { ...(config.output ?? {}), dir: String(options.outputDir) };
  }
  if (Object.hasOwn(options, "chips")) {
    config.criteria.chips = String(options.chips ?? "").split(",").map((chip) => chip.trim()).filter(Boolean);
  }
  if (Object.hasOwn(options, "requiredTerm")) {
    config.criteria.requiredTerms = String(options.requiredTerm).split(",").map((term) => term.trim()).filter(Boolean);
  }
  if (Object.hasOwn(options, "rejectUnknownRam")) config.criteria.rejectUnknownRam = toBoolean(options.rejectUnknownRam);
  if (Object.hasOwn(options, "requireMacBookPro")) config.criteria.requireMacBookPro = toBoolean(options.requireMacBookPro);
  if (Object.hasOwn(options, "rejectMacBookAir")) config.criteria.rejectMacBookAir = toBoolean(options.rejectMacBookAir);
  if (options.intervalMinutes) config.watch.intervalMinutes = Number(options.intervalMinutes);
  return config;
}

async function promptSearchConfig(config, options) {
  if (!shouldPromptSearch(options)) return;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const defaultProfile = config.profile ?? config.queries.join("; ");
    const query = (await rl.question(`Busqueda [${defaultProfile}]: `)).trim();
    if (query) applyQueryProfile(config, query.split(";"));

    const max = (await rl.question(`Precio maximo puesto COP [${formatCop(config.criteria.maxLandedCop)}]: `)).trim();
    if (max) config.criteria.maxLandedCop = parseCop(max, config.criteria.maxLandedCop);

    const exportFormat = (await rl.question("Exportar para IA [txt/json/all/none] [txt]: ")).trim();
    config.output = {
      ...(config.output ?? {}),
      enabled: exportFormat.toLowerCase() !== "none",
      formats: exportFormat ? exportFormat.split(",") : ["txt"]
    };
  } finally {
    rl.close();
  }
}

function shouldPromptSearch(options) {
  if (options.guided) return true;
  if (options.noInteractive || toBoolean(options.interactive) === false || process.env.CI) return false;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  return ![
    "queries",
    "minRamGb",
    "maxLandedCop",
    "minLandedCop",
    "greatDealCop",
    "chips",
    "strictSpecs",
    "looseSpecs",
    "requiredTerm",
    "rejectUnknownRam",
    "requireMacBookPro",
    "rejectMacBookAir"
  ].some((key) => Object.hasOwn(options, key));
}

function parseCop(value, fallback) {
  const normalized = String(value).trim().toLowerCase();
  const usesMillions = normalized.endsWith("m");
  const amount = usesMillions
    ? Number(normalized.replace(/m$/, "").replace(",", "."))
    : Number(normalized.replace(/[^\d]/g, ""));
  const parsed = amount * (usesMillions ? 1_000_000 : 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatCop(value) {
  return new Intl.NumberFormat("es-CO").format(value);
}

function toBoolean(value) {
  return !["false", "0", "no"].includes(String(value).toLowerCase());
}

function applyStrictSpecs(config) {
  const strict = config.criteria.strictSpecs ?? {};
  if (Object.hasOwn(strict, "minRamGb")) config.criteria.minRamGb = strict.minRamGb;
  if (Object.hasOwn(strict, "chips")) config.criteria.chips = strict.chips;
  if (Object.hasOwn(strict, "requireMacBookPro")) config.criteria.requireMacBookPro = strict.requireMacBookPro;
  if (Object.hasOwn(strict, "rejectUnknownRam")) config.criteria.rejectUnknownRam = strict.rejectUnknownRam;
  if (Object.hasOwn(strict, "rejectMacBookAir")) config.criteria.rejectMacBookAir = strict.rejectMacBookAir;
}

function applyLooseSpecs(config) {
  config.criteria.minRamGb = 0;
  config.criteria.chips = [];
  config.criteria.requireMacBookPro = false;
  config.criteria.rejectUnknownRam = false;
  config.criteria.rejectMacBookAir = false;
}

function applyQueryProfile(config, queries, { keepRequiredTerms = false } = {}) {
  const parsedQueries = queries.map((item) => String(item).trim()).filter(Boolean);
  if (parsedQueries.length === 0) return;

  config.queries = parsedQueries;
  config.profile = parsedQueries.join("; ");
  overrideSourceQueries(config, parsedQueries);
  if (!keepRequiredTerms) config.criteria.requiredTerms = inferRequiredTerms(parsedQueries);
}

function overrideSourceQueries(config, queries) {
  for (const group of [config.sources.browser, config.sources.patchrightBrowser]) {
    for (const source of group?.sources ?? []) source.queries = queries;
  }
  for (const key of ["woocommerce"]) {
    for (const source of config.sources[key] ?? []) source.queries = queries;
  }
}

function inferRequiredTerms(queries) {
  const stopWords = new Set(["de", "del", "la", "el", "los", "las", "para", "con", "y", "en", "oferta"]);
  const terms = [];
  for (const query of queries) {
    for (const term of String(query).toLowerCase().split(/[^a-z0-9]+/i)) {
      if (term.length < 2 || stopWords.has(term)) continue;
      terms.push(term);
    }
  }
  return [...new Set(terms)].slice(0, 5);
}
