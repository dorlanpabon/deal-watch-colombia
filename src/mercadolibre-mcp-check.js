#!/usr/bin/env node
import "dotenv/config";
import { loadConfig } from "./config.js";
import { searchMercadoLibreMcp } from "./sources/mercadolibre-mcp.js";

const config = await loadConfig();

try {
  const items = await searchMercadoLibreMcp("MacBook Pro M4 24GB", config);
  console.log(`mcp_ok ${items.length}`);
  if (items[0]) console.log(JSON.stringify(items[0], null, 2));
} catch (err) {
  console.log(`mcp_fail ${err.status ?? ""} ${err.message}`);
}
