const NON_NUMBER = /[^\d,.\-+]/g;

export function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[:]/g, "")
    .trim();
}

export function parseGermanNumber(raw?: string | null) {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "n/a") return null;

  let multiplier = 1;
  if (/mrd/i.test(cleaned)) multiplier = 1_000_000_000;
  else if (/mio/i.test(cleaned)) multiplier = 1_000_000;
  else if (/tsd|tausend/i.test(cleaned)) multiplier = 1_000;

  const numberPart = cleaned.replace(NON_NUMBER, "");
  if (!numberPart) return null;

  const normalized = numberPart
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed * multiplier;
}

export function parsePercent(raw?: string | null) {
  const num = parseGermanNumber(raw);
  if (num === null) return null;
  return num / 100;
}

export function parseDateGerman(raw?: string | null) {
  if (!raw) return null;
  const cleaned = raw.trim();
  const match = cleaned.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${year}-${month}-${day}`;
}

export function toRawValue(label: string, raw?: string | null, value?: number | null) {
  return {
    label,
    raw: raw ?? "",
    value: value ?? null,
  };
}
