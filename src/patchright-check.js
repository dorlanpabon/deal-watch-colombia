#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { searchPatchrightBrowserSources } from "./sources/patchright-browser.js";

const config = await loadConfig();
config.sources.patchrightBrowser.enabled = true;

const items = await searchPatchrightBrowserSources(["MacBook Pro M4"], config);
console.log(`patchright_ok ${items.length}`);
if (items[0]) console.log(JSON.stringify(items[0], null, 2));
