#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { searchPatchrightBrowserSources } from "./sources/patchright-browser.js";

const config = await loadConfig();

const headlessRetail = await runPatchrightCheck(config, {
  headless: true,
  userDataDir: "data/patchright-retail-headless-profile",
  sources: [
    {
      name: "Ktronix",
      enabled: true,
      searchUrl: "https://www.ktronix.com/search?text={query}",
      queries: ["MacBook Pro M5"],
      itemSelector: ".js-product-item",
      urlContains: "ktronix.com/",
      currency: "COP",
      international: false,
      waitMs: 5_000
    }
  ]
});
console.log(`patchright_headless_retail ${headlessRetail.length}`);
if (headlessRetail[0]) console.log(JSON.stringify(headlessRetail[0], null, 2));

const headlessMl = await runPatchrightCheck(config, {
  headless: true,
  userDataDir: "data/patchright-profile",
  sources: config.sources.patchrightBrowser.sources
});
console.log(`patchright_headless_ml ${headlessMl.length}`);

const visibleMl = await runPatchrightCheck(config, {
  headless: false,
  userDataDir: "data/patchright-profile",
  sources: config.sources.patchrightBrowser.sources
});
console.log(`patchright_visible_ml ${visibleMl.length}`);
if (visibleMl[0]) console.log(JSON.stringify(visibleMl[0], null, 2));

async function runPatchrightCheck(config, patchrightBrowser) {
  const cloned = structuredClone(config);
  cloned.sources.patchrightBrowser = {
    ...cloned.sources.patchrightBrowser,
    ...patchrightBrowser,
    enabled: true
  };
  return searchPatchrightBrowserSources(["MacBook Pro M4"], cloned);
}
