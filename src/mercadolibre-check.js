#!/usr/bin/env node
import "dotenv/config";
import { chromium } from "patchright";
import { loadConfig } from "./config.js";
import { searchMercadoLibre } from "./sources/mercadolibre.js";

const config = await loadConfig();

try {
  const api = await searchMercadoLibre("MacBook Pro M4 24GB", config);
  console.log(`api_ok ${api.length}`);
} catch (err) {
  console.log(`api_fail ${err.message}`);
}

const browserConfig = config.sources.browser;
const context = await chromium.launchPersistentContext(browserConfig.userDataDir, {
  headless: browserConfig.headless,
  locale: "es-CO",
  ...launchArgs(browserConfig)
});

try {
  const page = context.pages()[0] ?? await context.newPage();
  await minimizeWindow(page, browserConfig);
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

function launchArgs(browserConfig) {
  const args = [];
  if (!browserConfig.headless && browserConfig.startMinimized) args.push("--start-minimized");
  return args.length ? { args } : {};
}

async function minimizeWindow(page, browserConfig) {
  if (browserConfig.headless || !browserConfig.startMinimized) return;
  try {
    const session = await page.context().newCDPSession(page);
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "minimized" } });
    await session.detach();
  } catch {
  }
}
