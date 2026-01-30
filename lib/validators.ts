export type CreateProjectInput = {
  name: string;
  baseCurrency?: string;
  riskProfile?: "conservative" | "balanced" | "aggressive";
};

export type CreatePositionInput = {
  isin: string;
  side: "put" | "call";
  size: number;
  entryPrice: number;
};

type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function validateCreateProject(input: unknown): ValidationResult<CreateProjectInput> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid payload" };
  }

  const body = input as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const baseCurrency =
    typeof body.baseCurrency === "string" ? body.baseCurrency.trim().toUpperCase() : "";
  const riskProfile =
    typeof body.riskProfile === "string" ? body.riskProfile.trim() : "";

  if (!name) {
    return { ok: false, error: "Project name is required" };
  }

  if (name.length > 80) {
    return { ok: false, error: "Project name is too long" };
  }

  if (baseCurrency && baseCurrency.length > 8) {
    return { ok: false, error: "Base currency is too long" };
  }

  if (
    riskProfile &&
    riskProfile !== "conservative" &&
    riskProfile !== "balanced" &&
    riskProfile !== "aggressive"
  ) {
    return { ok: false, error: "Invalid risk profile" };
  }

  return {
    ok: true,
    data: {
      name,
      baseCurrency: baseCurrency || undefined,
      riskProfile: (riskProfile as CreateProjectInput["riskProfile"]) || undefined,
    },
  };
}

export function validateCreatePosition(input: unknown): ValidationResult<CreatePositionInput> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid payload" };
  }

  const body = input as Record<string, unknown>;
  const isin = typeof body.isin === "string" ? body.isin.trim().toUpperCase() : "";
  const side = typeof body.side === "string" ? body.side.trim().toLowerCase() : "";
  const size = typeof body.size === "number" ? body.size : Number(body.size);
  const entryPrice =
    typeof body.entryPrice === "number" ? body.entryPrice : Number(body.entryPrice);

  if (!isin) {
    return { ok: false, error: "ISIN is required" };
  }

  if (isin.length < 6 || isin.length > 20) {
    return { ok: false, error: "Invalid ISIN" };
  }

  if (side !== "put" && side !== "call") {
    return { ok: false, error: "Side must be put or call" };
  }

  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "Size must be a positive number" };
  }

  if (!Number.isFinite(entryPrice) || entryPrice < 0) {
    return { ok: false, error: "Entry price must be 0 or greater" };
  }

  return {
    ok: true,
    data: {
      isin,
      side: side as CreatePositionInput["side"],
      size,
      entryPrice,
    },
  };
}
