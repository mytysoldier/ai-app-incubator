import { GEMINI_FLASH_LITE_PRICING } from "@/lib/gemini-prompt";

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
    (inputTokens * GEMINI_FLASH_LITE_PRICING.inputUsdPerMillionTokens +
      (outputTokens + thinkingTokens) *
        GEMINI_FLASH_LITE_PRICING.outputIncludingThinkingUsdPerMillionTokens) /
    1_000_000;

  return { inputTokens, outputTokens, thinkingTokens, estimatedCostUsd };
}
