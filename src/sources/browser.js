import { chromium } from "patchright";
import { searchBrowserSourcesWithEngine } from "./browser-core.js";

export async function searchBrowserSources(queries, config) {
  return searchBrowserSourcesWithEngine(chromium, queries, config, config.sources.browser);
}
