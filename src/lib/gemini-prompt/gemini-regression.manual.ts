import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { afterAll, describe, expect, it } from "vitest";
import { parseMvpDefinition } from "../mvp-definition";
import {
  GEMINI_PROMPT_CONFIG,
  MVP_DEFINITION_SYSTEM_INSTRUCTION,
  createMvpDefinitionUserPrompt,
  evaluateMvpDefinition,
  evaluateMvpDefinitionBatch,
  estimateGeminiGenerationCostYen,
  type GeminiTokenUsage,
} from "./index";
import { representativePromptCases } from "./evaluation-cases";
import { mvpDefinitionSchema } from "../mvp-definition/schema";

type SafeCaseResult = {
  id: string;
  passed: boolean;
  failedQualityCriteria: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  thinkingTokens: number | null;
  estimatedCostYen: number | null;
};

const safeResults: SafeCaseResult[] = [];
const artifactPath = process.env.GEMINI_EVALUATION_ARTIFACT;

function tokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function usageFromMetadata(metadata: unknown): {
  usage: GeminiTokenUsage | null;
  inputTokens: number | null;
  outputTokens: number | null;
  thinkingTokens: number | null;
} {
  const record =
    typeof metadata === "object" && metadata !== null
      ? (metadata as Record<string, unknown>)
      : {};
  const inputTokens = tokenCount(record.promptTokenCount);
  const outputTokens = tokenCount(record.candidatesTokenCount);
  const thinkingTokens =
    record.thoughtsTokenCount === undefined ? 0 : tokenCount(record.thoughtsTokenCount);

  return {
    usage:
      inputTokens === null || outputTokens === null || thinkingTokens === null
        ? null
        : {
            inputTokens,
            outputTokensIncludingThinking: outputTokens + thinkingTokens,
          },
    inputTokens,
    outputTokens,
    thinkingTokens,
  };
}

async function writeSafeReport(): Promise<void> {
  if (!artifactPath) {
    return;
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(
    artifactPath,
    `${JSON.stringify({ sampleCount: safeResults.length, cases: safeResults }, null, 2)}\n`,
    "utf8",
  );
}

afterAll(async () => {
  await writeSafeReport();
});

describe("Gemini prompt regression evaluation (manual only)", () => {
  it("evaluates every representative prompt without exposing request or response bodies", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey, "GEMINI_API_KEY must be configured for this manual workflow.").toBeTruthy();

    const client = new GoogleGenAI({ apiKey });
    const samples: Array<{ id: string; value: unknown; usage: GeminiTokenUsage }> = [];

    for (const promptCase of representativePromptCases) {
      let value: unknown = null;
      let usage: GeminiTokenUsage | null = null;
      let inputTokens: number | null = null;
      let outputTokens: number | null = null;
      let thinkingTokens: number | null = null;
      let failedQualityCriteria = ["モデル応答を評価できない"];

      try {
        const response = await client.models.generateContent({
          model: GEMINI_PROMPT_CONFIG.model,
          contents: createMvpDefinitionUserPrompt(promptCase),
          config: {
            systemInstruction: MVP_DEFINITION_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseJsonSchema: mvpDefinitionSchema,
            maxOutputTokens: GEMINI_PROMPT_CONFIG.maxOutputTokens,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        });

        ({ usage, inputTokens, outputTokens, thinkingTokens } = usageFromMetadata(
          response.usageMetadata,
        ));

        if (!response.text) {
          throw new Error("Gemini returned an empty response.");
        }

        value = JSON.parse(response.text);
        const parsed = parseMvpDefinition(value);
        const evaluation = evaluateMvpDefinition(value);
        failedQualityCriteria = evaluation.checks
          .filter((check) => !check.passed)
          .map((check) => check.criterion);

        expect(parsed.success).toBe(true);
        expect(evaluation.passed).toBe(true);
        expect(usage).not.toBeNull();

        samples.push({
          id: promptCase.id,
          value,
          usage: usage as GeminiTokenUsage,
        });
      } catch {
        // Keep API errors and generated content out of CI logs and artifacts.
      }

      safeResults.push({
        id: promptCase.id,
        passed:
          usage !== null && failedQualityCriteria.length === 0,
        failedQualityCriteria,
        inputTokens,
        outputTokens,
        thinkingTokens,
        estimatedCostYen: usage ? estimateGeminiGenerationCostYen(usage) : null,
      });
    }

    const batch = evaluateMvpDefinitionBatch(samples);
    expect(batch.passed).toBe(true);
  }, 10 * 90_000);
});
