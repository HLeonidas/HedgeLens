import { z } from "zod";

const positiveNumber = z.number().finite().gt(0);
const nonNegativeNumber = z.number().finite().min(0);

export const instrumentSchema = z.object({
  isin: z.string().min(1),
  name: z.string().optional().nullable(),
  issuer: z.string().optional().nullable(),
  warrantType: z.enum(["call", "put"]),
  underlyingName: z.string().optional().nullable(),
  underlyingSymbol: z.string().min(1),
  strike: positiveNumber,
  expiry: z.string().min(1),
  ratio: positiveNumber.default(1),
  currency: z.string().min(1),
  settlementType: z.enum(["cash", "physical"]).optional().nullable(),
  multiplier: positiveNumber.optional().nullable().default(1),
});

export const pricingInputsSchema = z.object({
  valuationDate: z.string().min(1),
  underlyingPrice: positiveNumber,
  volatility: positiveNumber,
  rate: z.number().finite(),
  dividendYield: z.number().finite().min(0),
  fxRate: positiveNumber.optional().nullable().default(1),
  marketPrice: nonNegativeNumber.optional().nullable(),
  bid: nonNegativeNumber.optional().nullable(),
  ask: nonNegativeNumber.optional().nullable(),
});

export const positionFieldsSchema = z.object({
  projectId: z.string().min(1),
  entryPrice: nonNegativeNumber,
  quantity: positiveNumber,
});

export const computedSchema = z.object({
  fairValue: z.number().finite().nullable(),
  intrinsicValue: z.number().finite().nullable(),
  timeValue: z.number().finite().nullable(),
  breakEven: z.number().finite().nullable(),
  agio: z
    .object({
      absolute: z.number().finite().nullable(),
      percent: z.number().finite().nullable(),
    })
    .optional(),
  delta: z.number().finite().nullable(),
  gamma: z.number().finite().nullable(),
  theta: z.number().finite().nullable(),
  vega: z.number().finite().nullable(),
  omega: z.number().finite().nullable(),
  asOf: z.string().min(1),
  warnings: z.array(z.string()).optional(),
});

export const computedSnapshotSchema = z.object({
  inputHash: z.string().min(1),
  computed: computedSchema,
});

export const optionscheinBaseSchema = z.object({
  instrument: instrumentSchema,
  pricingInputs: pricingInputsSchema,
  computedSnapshot: computedSnapshotSchema.optional().nullable(),
});

export const optionscheinCreateSchema = optionscheinBaseSchema.extend({
  position: positionFieldsSchema.optional().nullable(),
});

export const optionscheinUpdateSchema = z.object({
  instrument: instrumentSchema.optional(),
  pricingInputs: pricingInputsSchema.optional(),
  computedSnapshot: computedSnapshotSchema.optional().nullable(),
  position: positionFieldsSchema.optional().nullable(),
});
