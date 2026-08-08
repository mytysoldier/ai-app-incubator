import { describe, expect, it } from "vitest";
import { completeDefinition } from "../mvp-definition/test-fixtures";
import {
  createMvpDefinitionUserPrompt,
  evaluateMvpDefinitionBatch,
  estimateGeminiGenerationCostYen,
  evaluateMvpDefinition,
  GEMINI_PROMPT_CONFIG,
  MVP_DEFINITION_SYSTEM_INSTRUCTION,
} from "./index";
import { representativePromptCases } from "./evaluation-cases";
import { MVP_DEFINITION_LIMITS, mvpDefinitionSchema } from "../mvp-definition";

describe("Gemini MVP definition prompt", () => {
  it("uses the approved model, minimal thinking, and a cost-safe output target", () => {
    expect(GEMINI_PROMPT_CONFIG).toMatchObject({
      model: "gemini-3.1-flash-lite",
      thinkingLevel: "minimal",
      maxOutputTokens: 3_000,
    });
    expect(
      estimateGeminiGenerationCostYen({
        inputTokens: GEMINI_PROMPT_CONFIG.maxInputTokensTarget,
        outputTokensIncludingThinking: GEMINI_PROMPT_CONFIG.maxOutputTokens,
      }),
    ).toBeLessThan(1);
  });

  it("keeps the Japanese, scope, duplication, and uncertainty rules in the system instruction", () => {
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain("すべての値を自然な日本語");
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain("繰り返さない");
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain("1〜2週間");
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain("assumptionsまたはopenQuestions");
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain("各項目は次の目的で使い分けてください");
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain("technicalRisksはリスク・影響・軽減策");
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).not.toContain("Schemaのdescription");
  });

  it("keeps Gemini output limits aligned with local validation", () => {
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain(
      `短い名前・分類・型は${MVP_DEFINITION_LIMITS.shortText}文字以内`,
    );
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain(
      `それ以外の文章は${MVP_DEFINITION_LIMITS.text}文字以内`,
    );
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain(
      `implementationTasksのorderは1から${MVP_DEFINITION_LIMITS.implementationTasks}の連番`,
    );
    expect(MVP_DEFINITION_SYSTEM_INSTRUCTION).toContain(
      "空文字列や空白だけの文字列は使わない",
    );
  });

  it("creates prompts for at least ten representative ideas", () => {
    expect(representativePromptCases).toHaveLength(10);
    for (const testCase of representativePromptCases) {
      expect(createMvpDefinitionUserPrompt(testCase)).toContain(testCase.idea);
    }
  });

  it("has a description for every structured output field", () => {
    for (const property of Object.values(mvpDefinitionSchema.properties)) {
      expect(property.description).toEqual(expect.any(String));
    }
  });

  it("passes a schema-valid definition that satisfies the quality gates", () => {
    expect(evaluateMvpDefinition(completeDefinition)).toEqual({
      schemaValid: true,
      checks: expect.arrayContaining([
        expect.objectContaining({ passed: true }),
      ]),
      passed: true,
    });
  });

  it("rejects a result without MVP boundaries, reasons, tasks, or uncertainty", () => {
    const result = evaluateMvpDefinition({
      ...completeDefinition,
      outOfScope: [],
      techStack: [],
      implementationTasks: [],
      assumptions: [],
      openQuestions: [],
    });

    expect(result.schemaValid).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.checks.filter((check) => !check.passed)).toHaveLength(4);
  });

  it("aggregates ten representative outputs and keeps their average estimated cost under one yen", () => {
    const result = evaluateMvpDefinitionBatch(
      representativePromptCases.map((testCase) => ({
        id: testCase.id,
        value: completeDefinition,
        usage: {
          inputTokens: GEMINI_PROMPT_CONFIG.maxInputTokensTarget,
          outputTokensIncludingThinking: GEMINI_PROMPT_CONFIG.maxOutputTokens,
        },
      })),
    );

    expect(result).toMatchObject({
      sampleCount: 10,
      hasAtLeastTenSamples: true,
      hasUniqueSampleIds: true,
      hasValidTokenUsage: true,
      passingSampleCount: 10,
      isAverageCostUnderOneYen: true,
      passed: true,
    });
    expect(result.averageEstimatedCostYen).toBeCloseTo(0.96);
  });

  it("fails the batch gate when a sample id is duplicated or fewer than ten outputs are supplied", () => {
    const result = evaluateMvpDefinitionBatch([
      {
        id: "duplicate",
        value: completeDefinition,
        usage: { inputTokens: 1, outputTokensIncludingThinking: 1 },
      },
      {
        id: "duplicate",
        value: completeDefinition,
        usage: { inputTokens: 1, outputTokensIncludingThinking: 1 },
      },
    ]);

    expect(result).toMatchObject({
      hasAtLeastTenSamples: false,
      hasUniqueSampleIds: false,
      passed: false,
    });
  });

  it("rejects negative, fractional, and non-finite token usage", () => {
    const invalidTokenCounts = [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY];
    const result = evaluateMvpDefinitionBatch(
      invalidTokenCounts.map((inputTokens, index) => ({
        id: `invalid-usage-${index}`,
        value: completeDefinition,
        usage: { inputTokens, outputTokensIncludingThinking: 1 },
      })),
    );

    expect(result).toMatchObject({
      hasValidTokenUsage: false,
      averageEstimatedCostYen: null,
      isAverageCostUnderOneYen: false,
      passed: false,
    });
    expect(result.results.every((item) => item.estimatedCostYen === null)).toBe(true);
  });

  it("rejects an exact one-yen average even when floating-point estimation is imprecise", () => {
    const result = evaluateMvpDefinitionBatch(
      representativePromptCases.map((testCase) => ({
        id: testCase.id,
        value: completeDefinition,
        usage: { inputTokens: 24_994, outputTokensIncludingThinking: 1 },
      })),
    );

    expect(result.averageEstimatedCostYen).toBeCloseTo(1);
    expect(result).toMatchObject({
      isAverageCostUnderOneYen: false,
      passed: false,
    });
  });

  it("accepts an average strictly below one yen", () => {
    const result = evaluateMvpDefinitionBatch(
      representativePromptCases.map((testCase) => ({
        id: testCase.id,
        value: completeDefinition,
        usage: { inputTokens: 24_993, outputTokensIncludingThinking: 1 },
      })),
    );

    expect(result).toMatchObject({
      isAverageCostUnderOneYen: true,
      passed: true,
    });
  });
});
