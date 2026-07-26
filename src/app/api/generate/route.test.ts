import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeDefinition } from "@/lib/mvp-definition/test-fixtures";

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  GoogleGenAI: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: mocks.GoogleGenAI,
  ThinkingLevel: { MINIMAL: "MINIMAL" },
}));

import { POST } from "./route";

const validRequestBody = {
  idea: "個人開発者が短期間で公開するアプリの要件を整理できるサービスを作りたい。",
  constraints: "ログイン機能は追加しない。",
};

function createRequest(body: unknown, contentType = "application/json"): Request {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
    mocks.GoogleGenAI.mockImplementation(function () {
      return { models: { generateContent: mocks.generateContent } };
    });
  });

  it("sends only validated input to Gemini and returns a schema-valid definition", async () => {
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify(completeDefinition) });

    const response = await POST(createRequest(validRequestBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: completeDefinition });
    expect(mocks.GoogleGenAI).toHaveBeenCalledWith({ apiKey: "test-api-key" });
    expect(mocks.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.1-flash-lite",
        config: expect.objectContaining({
          responseMimeType: "application/json",
          responseJsonSchema: expect.any(Object),
          maxOutputTokens: 3_000,
          thinkingConfig: { thinkingLevel: "MINIMAL" },
        }),
      }),
    );
  });

  it.each([
    [createRequest(validRequestBody, "text/plain"), "Content-Type"],
    [createRequest({ idea: "短すぎる" }), "20文字以上"],
    [createRequest("{"), "有効なJSON"],
  ])("rejects invalid requests before calling Gemini", async (request, message) => {
    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "invalid_request", message: expect.stringContaining(message) },
    });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it("fails safely when the API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await POST(createRequest(validRequestBody));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "configuration_error",
        message: expect.not.stringContaining("GEMINI_API_KEY"),
      },
    });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it("rejects malformed model output without returning its contents", async () => {
    mocks.generateContent.mockResolvedValue({ text: '{"not":"a definition"}' });

    const response = await POST(createRequest(validRequestBody));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "invalid_model_response",
        message: "生成結果を処理できませんでした。もう一度お試しください。",
      },
    });
  });

  it("retries a rate-limited request once, then returns a safe 429 response", async () => {
    mocks.generateContent.mockRejectedValue({ status: 429 });

    const response = await POST(createRequest(validRequestBody));

    expect(response.status).toBe(429);
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "rate_limited",
        message: expect.any(String),
      },
    });
  });

  it("does not retry a request that reached its timeout", async () => {
    mocks.generateContent.mockRejectedValue(new DOMException("", "AbortError"));

    const response = await POST(createRequest(validRequestBody));

    expect(response.status).toBe(504);
    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
  });
});
