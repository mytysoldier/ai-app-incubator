const INPUT_PRICE_PER_MILLION_TOKENS_USD = 0.5;
const OUTPUT_PRICE_PER_MILLION_TOKENS_USD = 3;

export type GenerationUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  thinkingTokens: number | null;
  estimatedCostUsd: number | null;
};

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
};

function validTokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function calculateGenerationUsage(
  metadata: GeminiUsageMetadata | undefined,
): GenerationUsage {
  if (!metadata) {
    return {
      inputTokens: null,
      outputTokens: null,
      thinkingTokens: null,
      estimatedCostUsd: null,
    };
  }

  const inputTokens = validTokenCount(metadata.promptTokenCount) ?? 0;
  const outputTokens = validTokenCount(metadata.candidatesTokenCount) ?? 0;
  const thinkingTokens = validTokenCount(metadata.thoughtsTokenCount) ?? 0;
  const estimatedCostUsd =
    (inputTokens * INPUT_PRICE_PER_MILLION_TOKENS_USD +
      (outputTokens + thinkingTokens) * OUTPUT_PRICE_PER_MILLION_TOKENS_USD) /
    1_000_000;

  return { inputTokens, outputTokens, thinkingTokens, estimatedCostUsd };
}
