import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import {
  GEMINI_PROMPT_CONFIG,
  MVP_DEFINITION_SYSTEM_INSTRUCTION,
  createMvpDefinitionUserPrompt,
} from "@/lib/gemini-prompt";
import {
  mvpDefinitionSchema,
  parseMvpDefinitionJson,
  type MvpDefinition,
} from "@/lib/mvp-definition";
import type { GenerateRequestInput } from "./request-validation";

const GENERATION_TIMEOUT_MS = 90_000;
const MAX_GENERATION_ATTEMPTS = 2;

export type GenerationErrorCode =
  | "rate_limited"
  | "generation_timeout"
  | "invalid_model_response"
  | "upstream_error";

export class GenerationError extends Error {
  constructor(readonly code: GenerationErrorCode) {
    super(code);
  }
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException
      ? error.name === "AbortError"
      : typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: unknown }).name === "AbortError"
  );
}

function isRetryableError(error: unknown): boolean {
  const status = getStatusCode(error);
  return status === 429 || (status !== undefined && status >= 500);
}

function toGenerationError(error: unknown): GenerationError {
  if (isAbortError(error)) {
    return new GenerationError("generation_timeout");
  }
  if (getStatusCode(error) === 429) {
    return new GenerationError("rate_limited");
  }
  return new GenerationError("upstream_error");
}

async function requestGeminiDefinition(apiKey: string, prompt: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model: GEMINI_PROMPT_CONFIG.model,
        contents: prompt,
        config: {
          abortSignal: controller.signal,
          systemInstruction: MVP_DEFINITION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: mvpDefinitionSchema,
          maxOutputTokens: GEMINI_PROMPT_CONFIG.maxOutputTokens,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });

      if (!response.text) {
        throw new Error("Gemini returned an empty response");
      }
      return response.text;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_GENERATION_ATTEMPTS - 1 || !isRetryableError(error)) {
        throw toGenerationError(error);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw toGenerationError(lastError);
}

export async function generateMvpDefinition(
  apiKey: string,
  input: GenerateRequestInput,
): Promise<MvpDefinition> {
  const responseText = await requestGeminiDefinition(
    apiKey,
    createMvpDefinitionUserPrompt(input),
  );
  const parsedDefinition = parseMvpDefinitionJson(responseText);

  if (!parsedDefinition.success) {
    throw new GenerationError("invalid_model_response");
  }

  return parsedDefinition.data;
}
