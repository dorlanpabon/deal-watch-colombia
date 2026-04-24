#!/usr/bin/env node
import "dotenv/config";
import process from "node:process";
import { loadConfig } from "./config.js";
import { searchOnce, watch } from "./runner.js";

const { command, options } = parseArgs(process.argv.slice(2));
const config = applyCliOptions(await loadConfig(options.config), options);

if (command === "search") {
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
    const value = inlineValue ?? args[++i];
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
  if (Object.hasOwn(options, "chips")) {
    config.criteria.chips = String(options.chips ?? "").split(",").map((chip) => chip.trim()).filter(Boolean);
  }
  if (options.requiredTerm) {
    config.criteria.requiredTerms = String(options.requiredTerm).split(",").map((term) => term.trim()).filter(Boolean);
  }
  if (options.rejectUnknownRam) config.criteria.rejectUnknownRam = options.rejectUnknownRam !== "false";
  if (options.requireMacBookPro) config.criteria.requireMacBookPro = options.requireMacBookPro !== "false";
  if (options.intervalMinutes) config.watch.intervalMinutes = Number(options.intervalMinutes);
  return config;
}
