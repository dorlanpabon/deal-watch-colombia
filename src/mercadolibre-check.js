#!/usr/bin/env node
import "dotenv/config";
import { chromium } from "playwright";
import { loadConfig } from "./config.js";
import { searchMercadoLibre } from "./sources/mercadolibre.js";

const config = await loadConfig();

try {
  const api = await searchMercadoLibre("MacBook Pro M4 24GB", config);
  console.log(`api_ok ${api.length}`);
} catch (err) {
  console.log(`api_fail ${err.message}`);
}

const context = await chromium.launchPersistentContext(config.sources.browser.userDataDir, {
  headless: config.sources.browser.headless,
  locale: "es-CO"
});

try {
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto("https://listado.mercadolibre.com.co/macbook-pro-m4-24gb", {
    waitUntil: "domcontentloaded",
    timeout: 60_000
  });
  await page.waitForTimeout(1_500);
  const items = await page.locator("li.ui-search-layout__item, .poly-card").count();
  const text = (await page.locator("body").innerText()).slice(0, 120).replace(/\s+/g, " ");
  console.log(`browser_items ${items}`);
  if (items === 0) console.log(`browser_text ${text}`);
} finally {
  await context.close();
}
