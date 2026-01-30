export function yearFraction(now: Date, expiry: string | Date) {
  const expiryDate = typeof expiry === "string" ? new Date(expiry) : expiry;
  const millis = expiryDate.getTime() - now.getTime();
  if (!Number.isFinite(millis)) return 0;
  return Math.max(0, millis / (365 * 24 * 60 * 60 * 1000));
}

export function normalPDF(x: number) {
  const invSqrtTwoPi = 0.3989422804014327;
  return invSqrtTwoPi * Math.exp(-0.5 * x * x);
}

export function normalCDF(x: number) {
  // Abramowitz and Stegun approximation
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const p = 0.2316419;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const pdf = normalPDF(absX);
  const poly = (((a5 * t + a4) * t + a3) * t + a2) * t + a1;
  const cdf = 1 - pdf * poly * t;
  return sign === 1 ? cdf : 1 - cdf;
}

export function isValidDate(value: string) {
  return Number.isFinite(Date.parse(value));
}
