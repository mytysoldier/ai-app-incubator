import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import {
  GEMINI_PROMPT_CONFIG,
  MVP_DEFINITION_SYSTEM_INSTRUCTION,
  createMvpDefinitionUserPrompt,
} from "@/lib/gemini-prompt";
import { mvpDefinitionSchema, parseMvpDefinitionJson } from "@/lib/mvp-definition";

export const runtime = "nodejs";

const IDEA_MIN_LENGTH = 20;
const FIELD_MAX_LENGTH = 2_000;
const REQUEST_MAX_BYTES = 20_000;
const GENERATION_TIMEOUT_MS = 90_000;
const MAX_GENERATION_ATTEMPTS = 2;

type GenerateRequestBody = {
  idea?: unknown;
  constraints?: unknown;
};

type ApiErrorCode =
  | "invalid_request"
  | "configuration_error"
  | "rate_limited"
  | "generation_timeout"
  | "invalid_model_response"
  | "upstream_error";

function errorResponse(status: number, code: ApiErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function characterCount(value: string): number {
  return Array.from(value).length;
}

function parseRequestBody(value: unknown):
  | { success: true; data: { idea: string; constraints?: string } }
  | { success: false; message: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { success: false, message: "JSONオブジェクトを送信してください。" };
  }

  const body = value as GenerateRequestBody;
  if (typeof body.idea !== "string") {
    return { success: false, message: "アプリアイデアを入力してください。" };
  }

  const idea = body.idea.trim();
  if (characterCount(idea) < IDEA_MIN_LENGTH) {
    return {
      success: false,
      message: `アプリアイデアは${IDEA_MIN_LENGTH}文字以上で入力してください。`,
    };
  }
  if (characterCount(body.idea) > FIELD_MAX_LENGTH) {
    return {
      success: false,
      message: `アプリアイデアは${FIELD_MAX_LENGTH}文字以内で入力してください。`,
    };
  }

  if (body.constraints !== undefined && typeof body.constraints !== "string") {
    return { success: false, message: "制約・希望条件は文字列で入力してください。" };
  }
  if (
    typeof body.constraints === "string" &&
    characterCount(body.constraints) > FIELD_MAX_LENGTH
  ) {
    return {
      success: false,
      message: `制約・希望条件は${FIELD_MAX_LENGTH}文字以内で入力してください。`,
    };
  }

  return {
    success: true,
    data: {
      idea,
      ...(body.constraints?.trim() ? { constraints: body.constraints.trim() } : {}),
    },
  };
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
      : typeof error === "object" && error !== null &&
          "name" in error &&
          (error as { name?: unknown }).name === "AbortError"
  );
}

function isRetryableError(error: unknown): boolean {
  const status = getStatusCode(error);
  return isAbortError(error) || status === 429 || (status !== undefined && status >= 500);
}

async function generateDefinition(apiKey: string, prompt: string): Promise<string> {
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
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("application/json")) {
    return errorResponse(400, "invalid_request", "Content-Typeはapplication/jsonにしてください。");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > REQUEST_MAX_BYTES) {
    return errorResponse(400, "invalid_request", "リクエスト本文が大きすぎます。");
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse(400, "invalid_request", "リクエスト本文を読み取れませんでした。");
  }
  if (new TextEncoder().encode(rawBody).byteLength > REQUEST_MAX_BYTES) {
    return errorResponse(400, "invalid_request", "リクエスト本文が大きすぎます。");
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "invalid_request", "有効なJSONを送信してください。");
  }

  const parsedRequest = parseRequestBody(requestBody);
  if (!parsedRequest.success) {
    return errorResponse(400, "invalid_request", parsedRequest.message);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse(
      503,
      "configuration_error",
      "生成サービスの設定が完了していません。時間をおいて再試行してください。",
    );
  }

  try {
    const responseText = await generateDefinition(
      apiKey,
      createMvpDefinitionUserPrompt(parsedRequest.data),
    );
    const parsedDefinition = parseMvpDefinitionJson(responseText);

    if (!parsedDefinition.success) {
      return errorResponse(
        502,
        "invalid_model_response",
        "生成結果を処理できませんでした。もう一度お試しください。",
      );
    }

    return Response.json({ data: parsedDefinition.data });
  } catch (error) {
    if (isAbortError(error)) {
      return errorResponse(
        504,
        "generation_timeout",
        "生成に時間がかかっています。時間をおいて再試行してください。",
      );
    }

    if (getStatusCode(error) === 429) {
      return errorResponse(
        429,
        "rate_limited",
        "現在リクエストが集中しています。時間をおいて再試行してください。",
      );
    }

    return errorResponse(
      502,
      "upstream_error",
      "生成サービスとの通信に失敗しました。時間をおいて再試行してください。",
    );
  }
}
