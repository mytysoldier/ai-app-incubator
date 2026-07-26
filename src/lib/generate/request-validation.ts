const IDEA_MIN_LENGTH = 20;
const FIELD_MAX_LENGTH = 2_000;

type GenerateRequestBody = {
  idea?: unknown;
  constraints?: unknown;
};

export type GenerateRequestInput = {
  idea: string;
  constraints?: string;
};

export type RequestValidationResult =
  | { success: true; data: GenerateRequestInput }
  | { success: false; message: string };

function characterCount(value: string): number {
  return Array.from(value).length;
}

export function validateGenerateRequest(value: unknown): RequestValidationResult {
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
