import { chromium } from "patchright";
import { searchBrowserSourcesWithEngine } from "./browser-core.js";

export async function searchPatchrightBrowserSources(queries, config) {
  return searchBrowserSourcesWithEngine(chromium, queries, config, config.sources.patchrightBrowser);
}
