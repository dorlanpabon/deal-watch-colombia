#!/usr/bin/env node
import "dotenv/config";
import process from "node:process";
import { loadConfig } from "./config.js";
import { searchOnce, watch } from "./runner.js";

const command = process.argv[2] ?? "search";
const config = await loadConfig();

if (command === "search") {
  await searchOnce(config);
} else if (command === "watch") {
  await watch(config);
} else {
  console.error("use: npm run search | npm run watch");
  process.exitCode = 1;
}
