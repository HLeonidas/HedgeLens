import { z } from "zod";

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
  pricingMode: "market" | "model";
  underlyingSymbol?: string;
  underlyingPrice?: number;
  strike?: number;
  expiry?: string;
  volatility?: number;
  rate?: number;
  dividendYield?: number;
  ratio?: number;
  marketPrice?: number;
};

export type UpdatePositionInput = Partial<CreatePositionInput>;

type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

const toNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
};

const requiredNumber = (schema: z.ZodNumber) => z.preprocess(toNumber, schema);
const optionalNumber = (schema: z.ZodNumber) => z.preprocess(toNumber, schema).optional();

const isinSchema = z
  .string()
  .trim()
  .min(6, "Invalid ISIN")
  .max(20, "Invalid ISIN");
const sideSchema = z.enum(["put", "call"]);
const sizeSchema = requiredNumber(
  z.number().finite().gt(0, "Size must be a positive number")
);
const entryPriceSchema = requiredNumber(
  z.number().finite().min(0, "Entry price must be 0 or greater")
);
const dateSchema = z.string().refine((value) => Number.isFinite(Date.parse(value)), {
  message: "Invalid expiry date",
});

const createMarketSchema = z.object({
  isin: isinSchema,
  side: sideSchema,
  size: sizeSchema,
  entryPrice: entryPriceSchema,
  pricingMode: z.literal("market"),
  marketPrice: requiredNumber(
    z.number().finite().min(0, "Market price must be 0 or greater")
  ),
  underlyingSymbol: z.string().trim().optional(),
  ratio: optionalNumber(z.number().finite().gt(0, "Ratio must be greater than 0")),
  dividendYield: optionalNumber(z.number().finite().min(0, "Dividend yield must be 0 or greater")),
});

const createModelSchema = z.object({
  isin: isinSchema,
  side: sideSchema,
  size: sizeSchema,
  entryPrice: entryPriceSchema,
  pricingMode: z.literal("model"),
  underlyingSymbol: z.string().trim().optional(),
  underlyingPrice: requiredNumber(
    z.number().finite().gt(0, "Underlying price must be greater than 0")
  ),
  strike: requiredNumber(z.number().finite().gt(0, "Strike must be greater than 0")),
  expiry: dateSchema,
  volatility: requiredNumber(z.number().finite().gt(0, "Volatility must be greater than 0")),
  rate: requiredNumber(z.number().finite().min(0, "Rate must be 0 or greater")),
  dividendYield: optionalNumber(
    z.number().finite().min(0, "Dividend yield must be 0 or greater")
  ),
  ratio: optionalNumber(z.number().finite().gt(0, "Ratio must be greater than 0")),
  marketPrice: optionalNumber(z.number().finite().min(0, "Market price must be 0 or greater")),
});

const createPositionSchema = z.discriminatedUnion("pricingMode", [
  createMarketSchema,
  createModelSchema,
]);

const updatePositionSchema = z.object({
  isin: isinSchema.optional(),
  side: sideSchema.optional(),
  size: sizeSchema.optional(),
  entryPrice: entryPriceSchema.optional(),
  pricingMode: z.enum(["market", "model"]).optional(),
  underlyingSymbol: z.string().trim().optional(),
  underlyingPrice: optionalNumber(
    z.number().finite().gt(0, "Underlying price must be greater than 0")
  ),
  strike: optionalNumber(z.number().finite().gt(0, "Strike must be greater than 0")),
  expiry: dateSchema.optional(),
  volatility: optionalNumber(
    z.number().finite().gt(0, "Volatility must be greater than 0")
  ),
  rate: optionalNumber(z.number().finite().min(0, "Rate must be 0 or greater")),
  dividendYield: optionalNumber(
    z.number().finite().min(0, "Dividend yield must be 0 or greater")
  ),
  ratio: optionalNumber(z.number().finite().gt(0, "Ratio must be greater than 0")),
  marketPrice: optionalNumber(
    z.number().finite().min(0, "Market price must be 0 or greater")
  ),
});

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(80, "Project name is too long"),
  baseCurrency: z
    .string()
    .trim()
    .max(8, "Base currency is too long")
    .optional()
    .transform((value) => (value ? value.toUpperCase() : undefined)),
  riskProfile: z.enum(["conservative", "balanced", "aggressive"]).optional(),
});

function toValidationResult<T>(result: z.SafeParseReturnType<unknown, T>): ValidationResult<T> {
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const message = result.error.issues[0]?.message ?? "Invalid payload";
  return { ok: false, error: message };
}

export function validateCreateProject(input: unknown): ValidationResult<CreateProjectInput> {
  return toValidationResult(createProjectSchema.safeParse(input));
}

export function validateCreatePosition(input: unknown): ValidationResult<CreatePositionInput> {
  return toValidationResult(createPositionSchema.safeParse(input));
}

export function validateUpdatePosition(input: unknown): ValidationResult<UpdatePositionInput> {
  return toValidationResult(updatePositionSchema.safeParse(input));
}

export function validatePositionAfterMerge(input: unknown): ValidationResult<CreatePositionInput> {
  return toValidationResult(createPositionSchema.safeParse(input));
}
