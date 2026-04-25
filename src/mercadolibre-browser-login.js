#!/usr/bin/env node
import { chromium } from "patchright";
import { loadConfig } from "./config.js";

const config = await loadConfig();
const browserConfig = config.sources.browser;
const context = await chromium.launchPersistentContext(browserConfig.userDataDir, {
  headless: false,
  locale: "es-CO",
  ...launchArgs(browserConfig)
});

const page = context.pages()[0] ?? await context.newPage();
await minimizeWindow(page, browserConfig);
await page.goto("https://www.mercadolibre.com.co/", {
  waitUntil: "domcontentloaded",
  timeout: 60_000
});

console.log("Inicia sesion si MercadoLibre lo pide. Cierra esta ventana cuando termines.");
await page.waitForEvent("close", { timeout: 0 }).catch(() => {});
await context.close();

function launchArgs(browserConfig) {
  const args = [];
  if (browserConfig.startMinimized) args.push("--start-minimized");
  return args.length ? { args } : {};
}

async function minimizeWindow(page, browserConfig) {
  if (!browserConfig.startMinimized) return;
  try {
    const session = await page.context().newCDPSession(page);
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "minimized" } });
    await session.detach();
  } catch {
  }
}
