import { describe, expect, it } from "vitest";
import { calculateGenerationUsage } from "./usage-cost";

describe("calculateGenerationUsage", () => {
  it("calculates the estimated Gemini cost including thinking tokens", () => {
    expect(
      calculateGenerationUsage({
        promptTokenCount: 1_000,
        candidatesTokenCount: 500,
        thoughtsTokenCount: 200,
      }),
    ).toEqual({
      inputTokens: 1_000,
      outputTokens: 500,
      thinkingTokens: 200,
      estimatedCostUsd: 0.0013,
    });
  });

  it("does not report a made-up cost when Gemini omits usage metadata", () => {
    expect(calculateGenerationUsage(undefined)).toEqual({
      inputTokens: null,
      outputTokens: null,
      thinkingTokens: null,
      estimatedCostUsd: null,
    });
  });
});
