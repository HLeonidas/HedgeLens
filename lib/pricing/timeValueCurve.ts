import { priceEuropeanCallPut } from "@/lib/pricing/blackScholes";
import { yearFraction } from "@/lib/pricing/utils";

type TimeValueCurveInput = {
  S: number;
  K: number;
  r: number;
  q?: number;
  sigma: number;
  type: "call" | "put";
  expiry: string;
  now?: Date;
  maxPoints?: number;
};

export type TimeValuePoint = { day: number; value: number };

export function generateTimeValueCurve(input: TimeValueCurveInput): TimeValuePoint[] {
  const now = input.now ?? new Date();
  const T = yearFraction(now, input.expiry);
  const remainingDays = Math.max(0, Math.ceil(T * 365));
  if (remainingDays === 0) return [{ day: 0, value: 0 }];

  const maxPoints = input.maxPoints ?? 90;
  const step = Math.max(1, Math.ceil(remainingDays / maxPoints));
  const points: TimeValuePoint[] = [];
  const intrinsic = Math.max(
    input.type === "call" ? input.S - input.K : input.K - input.S,
    0
  );

  for (let day = 0; day <= remainingDays; day += step) {
    const remaining = Math.max(0, remainingDays - day);
    const t = remaining / 365;
    const price = priceEuropeanCallPut({
      S: input.S,
      K: input.K,
      T: t,
      r: input.r,
      q: input.q,
      sigma: input.sigma,
      type: input.type,
    });
    const timeValue = Math.max(0, price - intrinsic);
    points.push({ day, value: Number(timeValue.toFixed(6)) });
  }

  if (points[points.length - 1]?.day !== remainingDays) {
    points.push({ day: remainingDays, value: 0 });
  }

  return points;
}
