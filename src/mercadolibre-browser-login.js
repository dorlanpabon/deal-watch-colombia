#!/usr/bin/env node
import { chromium } from "patchright";
import { loadConfig } from "./config.js";

const config = await loadConfig();
const context = await chromium.launchPersistentContext(config.sources.browser.userDataDir, {
  headless: false,
  locale: "es-CO"
});

const page = context.pages()[0] ?? await context.newPage();
await page.goto("https://www.mercadolibre.com.co/", {
  waitUntil: "domcontentloaded",
  timeout: 60_000
});

console.log("Inicia sesion si MercadoLibre lo pide. Cierra esta ventana cuando termines.");
await page.waitForEvent("close", { timeout: 0 }).catch(() => {});
await context.close();
