export async function searchBrowserSourcesWithEngine(chromium, queries, config, browserConfig) {
  if (!browserConfig?.enabled) return [];

  const queryList = Array.isArray(queries) ? queries : [queries];
  const sources = browserConfig.sources.filter((source) => source.enabled);
  if (sources.length === 0) return [];

  const { context, close } = await createBrowserContext(chromium, browserConfig);
  await installResourceBlocking(context, browserConfig);

  try {
    const page = context.pages()[0] ?? await context.newPage();
    const results = [];
    for (const source of sources) {
      const sourceQueries = source.queries ?? queryList;
      for (const sourceQuery of sourceQueries) {
        try {
          results.push(...await searchBrowserSource(page, source, sourceQuery, config, browserConfig));
        } catch (err) {
          if (process.env.SHOW_SOURCE_ERRORS !== "0") {
            console.error(`[source-error] ${source.name}: ${err.message}`);
          }
        }
      }
    }
    return results;
  } finally {
    await close();
  }
}

async function createBrowserContext(chromium, browserConfig) {
  const launchOptions = buildLaunchOptions(browserConfig);
  const contextOptions = { locale: "es-CO", serviceWorkers: "block" };

  if (browserConfig.userDataDir) {
    const context = await chromium.launchPersistentContext(browserConfig.userDataDir, {
      ...launchOptions,
      ...contextOptions
    });
    return { context, close: () => context.close() };
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext(contextOptions);
  return { context, close: () => browser.close() };
}

function buildLaunchOptions(browserConfig) {
  const args = [...(browserConfig.launchArgs ?? [])];
  if (!browserConfig.headless && browserConfig.startMinimized) args.push("--start-minimized");

  return {
    headless: browserConfig.headless,
    ...(args.length ? { args } : {})
  };
}

async function installResourceBlocking(context, browserConfig) {
  const resourceTypes = new Set(browserConfig.blockResources ?? defaultBlockedResourceTypes());
  const urlParts = (browserConfig.blockUrlPatterns ?? []).map((part) => part.toLowerCase());
  const extensions = browserConfig.blockExtensions ?? defaultBlockedExtensions();

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url().toLowerCase();
    const shouldBlock = resourceTypes.has(request.resourceType())
      || urlParts.some((part) => url.includes(part))
      || extensions.some((extension) => urlPath(url).endsWith(extension));

    if (shouldBlock) {
      await route.abort().catch(() => {});
      return;
    }

    await route.continue().catch(() => {});
  });
}

function defaultBlockedResourceTypes() {
  return ["image", "media", "font", "stylesheet"];
}

function defaultBlockedExtensions() {
  return [".css", ".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".mp4", ".webm"];
}

function urlPath(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url;
  }
}

async function searchBrowserSource(page, source, query, config, browserConfig) {
  await minimizeWindow(page, browserConfig);
  const url = source.searchUrl.replace("{query}", encodeURIComponent(query).replaceAll("%20", "+"));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(source.waitMs ?? browserConfig.waitMs ?? 1_500);

  const items = await evaluateItems(page, source);

  return items
    .map((item, index) => toListing(item, source, index, browserConfig))
    .filter((listing) => listing.title && listing.url && Number.isFinite(listing.price))
    .slice(0, config.watch.maxResultsPerSource);
}

async function evaluateItems(page, source) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await page.locator(source.itemSelector).evaluateAll((nodes, source) => {
        return nodes.map((node) => {
          const text = node.innerText || "";
          const title = source.titleSelector ? node.querySelector(source.titleSelector)?.innerText?.trim() ?? "" : "";
          const priceText = source.priceSelector ? node.querySelector(source.priceSelector)?.innerText?.trim() ?? "" : "";
          const anchors = source.urlSelector
            ? [...node.querySelectorAll(source.urlSelector)]
            : node.tagName === "A" ? [node, ...node.querySelectorAll("a")] : [...node.querySelectorAll("a")];
          const href = anchors
            .map((anchor) => anchor.href)
            .find((candidate) => !source.urlContains || candidate.includes(source.urlContains)) || "";

          return { text, href, title, priceText };
        });
      }, source);
    } catch (err) {
      if (!String(err.message).includes("Execution context was destroyed") || attempt === 1) throw err;
      await page.waitForTimeout(1_000);
    }
  }
  return [];
}

async function minimizeWindow(page, browserConfig) {
  if (browserConfig.headless || !browserConfig.startMinimized) return;
  if (page.__dealWatchMinimized) return;
  page.__dealWatchMinimized = true;

  try {
    const session = await page.context().newCDPSession(page);
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "minimized" } });
    await session.detach();
  } catch {
    // Chromium may reject this on some platforms; --start-minimized still applies.
  }
}

function toListing(item, source, index, browserConfig) {
  const lines = item.text.split("\n").map((line) => line.trim()).filter(Boolean);
  const title = item.title || lines.find((line) => /macbook/i.test(line) && !/shop on ebay/i.test(line)) || firstTitleLine(lines);
  const moneyLine = item.priceText || findMoneyLine(lines);
  const shippingLine = lines.find((line) => /shipping|env/i.test(line)) ?? "";
  const condition = lines.find((line) => (
    !/macbook/i.test(line)
    && /brand new|open box|pre-owned|used|parts only|nuevo|usado|caja abierta|segunda mano|repuestos/i.test(line)
  )) ?? "unknown";
  const seller = parseSeller(lines.find((line) => /positive|positivo/i.test(line)) ?? "");
  const price = parseMoney(moneyLine);
  const shippingCop = /free|gratis/i.test(shippingLine) ? 0 : parseShippingCop(shippingLine);
  const sourceName = browserConfig.sourcePrefix ? `${browserConfig.sourcePrefix} ${source.name}` : source.name;

  return {
    source: sourceName,
    id: `${sourceName}:${item.href || index}`,
    title,
    description: item.text,
    url: cleanUrl(item.href, source.baseUrl),
    price: price.amount,
    currency: source.currency ?? price.currency,
    condition,
    seller,
    shippingCop,
    international: Boolean(source.international)
  };
}

function firstTitleLine(lines) {
  return lines.find((line) => (
    line.length >= 8
    && !/(?:COP\s*)?\$\s*[0-9]/i.test(line)
    && !/cookie|privacidad|comprar|agregar|carrito|ordenar por|filtrar/i.test(line)
  )) ?? "";
}

function findMoneyLine(lines) {
  const moneyLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (/(?:COP\s*)?\$\s*[0-9]/i.test(lines[i])) moneyLines.push({ index: i, value: lines[i] });
    if (/^(?:COP\s*)?\$$/i.test(lines[i]) && /^[0-9]/.test(lines[i + 1] ?? "")) {
      moneyLines.push({ index: i, value: `${lines[i]}${lines[i + 1]}` });
    }
  }

  if (/current price|precio actual|precio de oferta/i.test(lines.join(" "))) {
    return moneyLines.at(-1)?.value ?? "";
  }

  const offIndex = lines.findIndex((line) => /\bOFF\b/i.test(line));
  if (offIndex > -1) {
    const discounted = moneyLines.filter((money) => money.index < offIndex).at(-1);
    if (discounted) return discounted.value;
  }

  return moneyLines[0]?.value ?? "";
}

function parseShippingCop(line) {
  const parsed = parseMoney(line);
  return parsed.currency === "COP" && Number.isFinite(parsed.amount) ? Math.round(parsed.amount) : undefined;
}

function parseMoney(line) {
  const text = String(line);
  const currency = /\bCOP\b/i.test(text) ? "COP" : "USD";
  const matches = [...text.matchAll(/(?:COP\s*)?\$\s*([0-9][0-9.,\s\u00a0\u202f]*)/gi)];
  const match = preferSalePrice(text, matches);
  return {
    amount: match ? parseLocaleNumber(match[1]) : Number.NaN,
    currency
  };
}

function preferSalePrice(text, matches) {
  if (matches.length === 0) return null;
  if (
    matches.length > 1
    && /current price|precio actual|precio de oferta|oferta|sale|off/i.test(text)
  ) {
    return matches.at(-1);
  }
  return matches[0];
}

function parseLocaleNumber(value) {
  const raw = String(value).replace(/[\s\u00a0\u202f]/g, "");
  if (raw.includes(",") && raw.includes(".")) {
    return Number(raw.lastIndexOf(".") > raw.lastIndexOf(",")
      ? raw.replaceAll(",", "")
      : raw.replaceAll(".", "").replace(",", "."));
  }
  if (raw.includes(",") && raw.split(",").at(-1).length === 2) {
    return Number(raw.replaceAll(".", "").replace(",", "."));
  }
  if (raw.includes(".") && raw.split(".").at(-1).length === 2) {
    return Number(raw.replaceAll(",", ""));
  }
  return Number(raw.replaceAll(",", "").replaceAll(".", ""));
}

function cleanUrl(url, baseUrl) {
  try {
    const parsed = new URL(url, baseUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function parseSeller(line) {
  const pctMatch = line.match(/([0-9]+(?:[,.][0-9]+)?)\s*%\s*(?:positive|positivo)/i);
  const countMatch = line.match(/\(([^)]+)\)/);
  return {
    positivePct: pctMatch ? Number(pctMatch[1].replace(",", ".")) : null,
    feedbackCount: countMatch ? parseCompactCount(countMatch[1]) : null
  };
}

function parseCompactCount(value) {
  const normalized = String(value).trim().replace(",", ".");
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)([KM])?$/i);
  if (!match) return null;
  const multiplier = match[2]?.toUpperCase() === "M" ? 1_000_000 : match[2]?.toUpperCase() === "K" ? 1_000 : 1;
  return Math.round(Number(match[1]) * multiplier);
}
