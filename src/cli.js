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
  if (options.queries?.length) config.queries = options.queries;
  if (options.minRamGb) config.criteria.minRamGb = Number(options.minRamGb);
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
  if (options.requiredTerm) {
    config.criteria.requiredTerms = String(options.requiredTerm).split(",").map((term) => term.trim()).filter(Boolean);
  }
  if (Object.hasOwn(options, "rejectUnknownRam")) config.criteria.rejectUnknownRam = toBoolean(options.rejectUnknownRam);
  if (Object.hasOwn(options, "requireMacBookPro")) config.criteria.requireMacBookPro = toBoolean(options.requireMacBookPro);
  if (options.intervalMinutes) config.watch.intervalMinutes = Number(options.intervalMinutes);
  return config;
}

async function promptSearchConfig(config, options) {
  if (!shouldPromptSearch(options)) return;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const defaultProfile = config.profile ?? config.queries.join("; ");
    const query = (await rl.question(`Busqueda [${defaultProfile}]: `)).trim();
    if (query) config.queries = query.split(";").map((item) => item.trim()).filter(Boolean);

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
    "requiredTerm",
    "rejectUnknownRam",
    "requireMacBookPro"
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
