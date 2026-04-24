import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = "data";
const SEEN_PATH = path.join(DATA_DIR, "seen.json");
const DEALS_PATH = path.join(DATA_DIR, "deals.jsonl");

export async function loadSeen() {
  try {
    return new Set(JSON.parse(await fs.readFile(SEEN_PATH, "utf8")));
  } catch {
    return new Set();
  }
}

export async function saveSeen(seen) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SEEN_PATH, `${JSON.stringify([...seen], null, 2)}\n`);
}

export async function appendDeals(deals) {
  if (deals.length === 0) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const rows = deals.map((deal) => JSON.stringify({ at: new Date().toISOString(), ...deal })).join("\n");
  await fs.appendFile(DEALS_PATH, `${rows}\n`);
}
