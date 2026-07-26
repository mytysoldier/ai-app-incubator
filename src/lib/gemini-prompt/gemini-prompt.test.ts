import { describe, expect, it } from "vitest";
import { completeDefinition } from "../mvp-definition/test-fixtures";
import {
  createMvpDefinitionUserPrompt,
  estimateGeminiGenerationCostYen,
  evaluateMvpDefinition,
  GEMINI_PROMPT_CONFIG,
  MVP_DEFINITION_SYSTEM_INSTRUCTION,
} from "./index";
import { representativePromptCases } from "./evaluation-cases";
import { mvpDefinitionSchema } from "../mvp-definition";

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
});
