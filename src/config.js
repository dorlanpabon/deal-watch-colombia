import fs from "node:fs/promises";

export async function loadConfig(path = "config.json") {
  const fallback = JSON.parse(await fs.readFile("config.example.json", "utf8"));
  try {
    const local = JSON.parse(await fs.readFile(path, "utf8"));
    return merge(fallback, local);
  } catch {
    return fallback;
  }
}

function merge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return mergeArray(base, override);
  if (!isObject(base) || !isObject(override)) return override ?? base;

  return Object.fromEntries(
    [...new Set([...Object.keys(base), ...Object.keys(override)])]
      .map((key) => [key, merge(base[key], override[key])])
  );
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function mergeArray(base, override) {
  if (!override) return base;
  if (!base) return override;
  if (!canMergeByName(base, override)) return override;

  const byName = new Map(base.map((item) => [item.name, item]));
  for (const item of override) {
    byName.set(item.name, merge(byName.get(item.name), item));
  }
  return [...byName.values()];
}

function canMergeByName(base, override) {
  return [...base, ...override].every((item) => isObject(item) && typeof item.name === "string");
}
