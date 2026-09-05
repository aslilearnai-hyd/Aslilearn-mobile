export const GEMINI_25_FLASH_INPUT_USD_PER_M = 0.3;
export const GEMINI_25_FLASH_OUTPUT_USD_PER_M = 2.5;
export const GEMINI_25_FLASH_LITE_INPUT_USD_PER_M = 0.1;
export const GEMINI_25_FLASH_LITE_OUTPUT_USD_PER_M = 0.4;
export const DEFAULT_USD_TO_INR = 95.11;

export type TokenTotals = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  callCount: number;
};

export type GeminiCostEstimate = {
  usd: number;
  inr: number;
  inputUsd?: number;
  outputUsd?: number;
  exchangeRateInr: number;
  model: string;
  pricingNote: string;
  batchTotalUsd?: number;
  batchTotalInr?: number;
  perRecordUsd?: number;
  perRecordInr?: number;
  savedCount?: number;
};

export type TokenCall = {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  label?: string;
  provider?: string;
};

export type TokenUsageSnapshot = {
  calls?: TokenCall[];
  totals?: Partial<TokenTotals>;
};

export function resolveGeminiPricing(modelName = "") {
  const model = String(modelName || "").toLowerCase();
  if (model.includes("flash-lite") || model.includes("flash_lite")) {
    return {
      model: "gemini-2.5-flash-lite",
      inputUsdPerM: GEMINI_25_FLASH_LITE_INPUT_USD_PER_M,
      outputUsdPerM: GEMINI_25_FLASH_LITE_OUTPUT_USD_PER_M,
      pricingNote:
        "Estimated from Gemini 2.5 Flash-Lite list pricing (input $0.10/M, output $0.40/M).",
    };
  }
  return {
    model: "gemini-2.5-flash",
    inputUsdPerM: GEMINI_25_FLASH_INPUT_USD_PER_M,
    outputUsdPerM: GEMINI_25_FLASH_OUTPUT_USD_PER_M,
    pricingNote: "Estimated from Gemini 2.5 Flash list pricing (input $0.30/M, output $2.50/M).",
  };
}

export function formatTokenCount(value: number): string {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

/** INR for Gemini costs — extra precision when amount is under ₹1. */
export function formatCostInr(value: number): string {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return formatInr(0);
  if (n < 0.01) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(n);
  }
  if (n < 1) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(n);
  }
  return formatInr(n);
}

export type StoredRecordCost = {
  usd?: number;
  inr?: number;
  batchTotalUsd?: number;
  batchTotalInr?: number;
  batchSize?: number;
  exchangeRateInr?: number;
  model?: string;
  pricingNote?: string;
};

/** Prefer batch total when present; otherwise per-record share. */
export function resolveRecordCostUsd(cost?: StoredRecordCost | null): number {
  if (!cost || typeof cost !== "object") return 0;
  const batch = Number(cost.batchTotalUsd);
  if (Number.isFinite(batch) && batch > 0) return batch;
  const usd = Number(cost.usd);
  return Number.isFinite(usd) && usd > 0 ? usd : 0;
}

export function resolveRecordCostInr(cost?: StoredRecordCost | null, exchangeRate = DEFAULT_USD_TO_INR): number {
  if (!cost || typeof cost !== "object") return 0;
  const batch = Number(cost.batchTotalInr);
  if (Number.isFinite(batch) && batch > 0) return batch;
  const inr = Number(cost.inr);
  if (Number.isFinite(inr) && inr > 0) return inr;
  const usd = resolveRecordCostUsd(cost);
  return usd > 0 ? Number((usd * exchangeRate).toFixed(4)) : 0;
}

export function perRecordShareFromCost(
  cost?: StoredRecordCost | null,
  savedCount = 1,
): { usd: number; inr: number } {
  const n = Math.max(1, Number(savedCount) || 1);
  const totalUsd = resolveRecordCostUsd(cost);
  const totalInr = resolveRecordCostInr(cost, Number(cost?.exchangeRateInr) || DEFAULT_USD_TO_INR);
  if (Number(cost?.batchTotalUsd) > 0 || Number(cost?.batchTotalInr) > 0) {
    return {
      usd: Number((totalUsd / n).toFixed(6)),
      inr: Number((totalInr / n).toFixed(4)),
    };
  }
  return {
    usd: Number(cost?.usd || 0),
    inr: Number(cost?.inr || 0),
  };
}

export function computeGeminiFlashCost(
  totals: Partial<TokenTotals>,
  modelName = "gemini-2.5-flash-lite",
  exchangeRateInr = DEFAULT_USD_TO_INR,
): GeminiCostEstimate {
  const promptTokens = Math.max(0, Number(totals.promptTokens || 0));
  const completionTokens = Math.max(0, Number(totals.completionTokens || 0));
  const pricing = resolveGeminiPricing(modelName);
  const inputUsd = (promptTokens / 1_000_000) * pricing.inputUsdPerM;
  const outputUsd = (completionTokens / 1_000_000) * pricing.outputUsdPerM;
  const usd = inputUsd + outputUsd;
  return {
    usd: Number(usd.toFixed(6)),
    inr: Number((usd * exchangeRateInr).toFixed(2)),
    inputUsd: Number(inputUsd.toFixed(6)),
    outputUsd: Number(outputUsd.toFixed(6)),
    exchangeRateInr,
    model: pricing.model,
    pricingNote: pricing.pricingNote,
  };
}

/** Sum each LLM call at its own model rate (Flash-Lite vs Flash in the same batch). */
export function computeGeminiCostFromTokenUsage(
  tokenUsage: TokenUsageSnapshot | undefined,
  exchangeRateInr = DEFAULT_USD_TO_INR,
): GeminiCostEstimate {
  const calls = Array.isArray(tokenUsage?.calls) ? tokenUsage.calls : [];
  if (calls.length > 0) {
    let inputUsd = 0;
    let outputUsd = 0;
    const modelTokenCounts = new Map<string, number>();

    for (const call of calls) {
      const promptTokens = Math.max(0, Number(call.promptTokens || 0));
      const completionTokens = Math.max(0, Number(call.completionTokens || 0));
      const pricing = resolveGeminiPricing(call.model || "");
      inputUsd += (promptTokens / 1_000_000) * pricing.inputUsdPerM;
      outputUsd += (completionTokens / 1_000_000) * pricing.outputUsdPerM;
      modelTokenCounts.set(
        pricing.model,
        (modelTokenCounts.get(pricing.model) || 0) + promptTokens + completionTokens,
      );
    }

    let dominantModel = resolveGeminiPricing("").model;
    let bestTokens = -1;
    for (const [model, tokens] of modelTokenCounts.entries()) {
      if (tokens > bestTokens) {
        dominantModel = model;
        bestTokens = tokens;
      }
    }

    const usd = inputUsd + outputUsd;
    const model =
      modelTokenCounts.size > 1 ? `mixed (${dominantModel} + others)` : dominantModel;

    return {
      usd: Number(usd.toFixed(6)),
      inr: Number((usd * exchangeRateInr).toFixed(2)),
      inputUsd: Number(inputUsd.toFixed(6)),
      outputUsd: Number(outputUsd.toFixed(6)),
      exchangeRateInr,
      model,
      pricingNote:
        "Estimated from Gemini list pricing per LLM call (input + output tokens × each model rate).",
    };
  }

  return computeGeminiFlashCost(
    tokenUsage?.totals || {},
    "gemini-2.5-flash-lite",
    exchangeRateInr,
  );
}

export function mergeTokenUsageSnapshots(
  base: { totals: TokenTotals; calls: TokenCall[] },
  next?: TokenUsageSnapshot,
): { totals: TokenTotals; calls: TokenCall[] } {
  if (!next) return base;
  const mergedCalls = [...base.calls, ...(Array.isArray(next.calls) ? next.calls : [])];
  return {
    totals: mergeTokenTotals(base.totals, next.totals),
    calls: mergedCalls,
  };
}

export function mergeTokenTotals(
  base: TokenTotals,
  next: Partial<TokenTotals> | undefined,
): TokenTotals {
  if (!next) return base;
  return {
    promptTokens: base.promptTokens + Number(next.promptTokens || 0),
    completionTokens: base.completionTokens + Number(next.completionTokens || 0),
    totalTokens: base.totalTokens + Number(next.totalTokens || 0),
    callCount: base.callCount + Number(next.callCount || 0),
  };
}

export function emptyTokenTotals(): TokenTotals {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0, callCount: 0 };
}
