export interface ModelPricing {
  inputCostPerMToken: number;
  cachedInputCostPerMToken: number;
  outputCostPerMToken: number;
}

export interface TokenUsageTotals {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

const PRICING_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";
const MILLION = 1_000_000;

const PROVIDER_PREFIXES = ["openai/", "azure/", "openrouter/openai/"];
const MODEL_ALIASES = new Map<string, string>([["gpt-5-codex", "gpt-5"]]);

let cachedPricing: Map<string, any> | null = null;

export async function getModelPricing(model: string): Promise<ModelPricing | null> {
  const pricing = await loadPricingDataset();
  if (!pricing || pricing.size === 0) return null;

  const candidates = createCandidates(model);
  for (const candidate of candidates) {
    const record = pricing.get(candidate);
    if (record) {
      return normalizePricing(record);
    }
  }

  // Fallback: try substring match (best-effort)
  const lower = model.toLowerCase();
  for (const [key, value] of pricing.entries()) {
    const cmp = key.toLowerCase();
    if (cmp.includes(lower) || lower.includes(cmp)) {
      return normalizePricing(value);
    }
  }

  return null;
}

export function calculateCostUSD(usage: TokenUsageTotals, pricing: ModelPricing): number {
  const cachedInput = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const nonCachedInput = Math.max(usage.inputTokens - cachedInput, 0);

  const inputCost = (nonCachedInput / MILLION) * pricing.inputCostPerMToken;
  const cachedCost = (cachedInput / MILLION) * pricing.cachedInputCostPerMToken;
  const outputCost = (usage.outputTokens / MILLION) * pricing.outputCostPerMToken;

  return inputCost + cachedCost + outputCost;
}

async function loadPricingDataset(): Promise<Map<string, any>> {
  if (cachedPricing) return cachedPricing;

  try {
    const response = await fetch(PRICING_URL, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return new Map();
    }
    const data = (await response.json()) as Record<string, any>;
    cachedPricing = new Map(Object.entries(data));
    return cachedPricing;
  } catch {
    return new Map();
  }
}

function createCandidates(model: string): string[] {
  const candidates = new Set<string>();
  candidates.add(model);
  const alias = MODEL_ALIASES.get(model);
  if (alias) {
    candidates.add(alias);
  }
  for (const prefix of PROVIDER_PREFIXES) {
    candidates.add(`${prefix}${model}`);
    if (alias) {
      candidates.add(`${prefix}${alias}`);
    }
  }
  return Array.from(candidates);
}

function toPerMillion(value?: number, fallback?: number): number {
  const perToken = value ?? fallback ?? 0;
  return perToken * MILLION;
}

function normalizePricing(record: any): ModelPricing {
  return {
    inputCostPerMToken: toPerMillion(record?.input_cost_per_token),
    cachedInputCostPerMToken: toPerMillion(
      record?.cache_read_input_token_cost,
      record?.input_cost_per_token
    ),
    outputCostPerMToken: toPerMillion(record?.output_cost_per_token),
  };
}
