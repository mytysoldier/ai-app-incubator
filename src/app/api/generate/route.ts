import {
  GenerationError,
  generateMvpDefinition,
} from "@/lib/generate/gemini-generation";
import {
  RequestBodyTooLargeError,
  readBodyWithinLimit,
} from "@/lib/generate/request-body";
import { validateGenerateRequest } from "@/lib/generate/request-validation";

export const runtime = "nodejs";

const REQUEST_MAX_BYTES = 20_000;

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function generationErrorResponse(error: GenerationError): Response {
  switch (error.code) {
    case "generation_timeout":
      return errorResponse(
        504,
        error.code,
        "生成に時間がかかっています。時間をおいて再試行してください。",
      );
    case "rate_limited":
      return errorResponse(
        429,
        error.code,
        "現在リクエストが集中しています。時間をおいて再試行してください。",
      );
    case "invalid_model_response":
      return errorResponse(
        502,
        error.code,
        "生成結果を処理できませんでした。もう一度お試しください。",
      );
    case "upstream_error":
      return errorResponse(
        502,
        error.code,
        "生成サービスとの通信に失敗しました。時間をおいて再試行してください。",
      );
  }
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
    rawBody = await readBodyWithinLimit(request.body, REQUEST_MAX_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return errorResponse(400, "invalid_request", "リクエスト本文が大きすぎます。");
    }

    return errorResponse(400, "invalid_request", "リクエスト本文を読み取れませんでした。");
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "invalid_request", "有効なJSONを送信してください。");
  }

  const parsedRequest = validateGenerateRequest(requestBody);
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
    return Response.json({ data: await generateMvpDefinition(apiKey, parsedRequest.data) });
  } catch (error) {
    if (error instanceof GenerationError) {
      return generationErrorResponse(error);
    }

    return errorResponse(
      502,
      "upstream_error",
      "生成サービスとの通信に失敗しました。時間をおいて再試行してください。",
    );
  }
}
