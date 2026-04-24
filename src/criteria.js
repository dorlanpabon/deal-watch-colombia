const CHIP_RE = /\bM([45])(?:\s*(?:PRO|MAX|ULTRA))?\b/i;
const RAM_RE = /\b(8|16|18|24|32|36|48|64|96|128)\s*(?:GB|G)\b/i;

export function inspectListing(text) {
  const normalized = normalizeText(text);
  const ramMatch = normalized.match(RAM_RE);
  const chipMatch = normalized.match(CHIP_RE);

  return {
    isMacBookPro: /\bMACBOOK\s+PRO\b/.test(normalized),
    isMacBookAir: /\bMACBOOK\s+AIR\b/.test(normalized),
    chip: chipMatch ? `M${chipMatch[1]}` : null,
    ramGb: ramMatch ? Number(ramMatch[1]) : null
  };
}

export function matchesCriteria(listing, criteria) {
  const text = `${listing.title} ${listing.description ?? ""}`;
  const normalized = normalizeText(text);
  const info = inspectListing(normalized);
  const reasons = [];

  for (const term of criteria.requiredTerms ?? []) {
    if (!normalized.includes(normalizeText(term))) reasons.push("required_term");
  }
  if (criteria.requireMacBookPro && !info.isMacBookPro) reasons.push("not_macbook_pro");
  if (info.isMacBookAir) reasons.push("macbook_air");
  if ((criteria.chips ?? []).length > 0 && (!info.chip || !criteria.chips.includes(info.chip))) reasons.push("chip");
  if (criteria.minRamGb && info.ramGb === null && criteria.rejectUnknownRam) reasons.push("ram_unknown");
  if (criteria.minRamGb && info.ramGb !== null && info.ramGb < criteria.minRamGb) reasons.push("ram_low");
  if ((criteria.rejectTerms ?? []).some((term) => normalized.includes(normalizeText(term)))) {
    reasons.push("reject_term");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    specs: info
  };
}

export function normalizeText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
