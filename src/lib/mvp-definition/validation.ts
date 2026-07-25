import { mvpDefinitionSchema } from "./schema";
import type { MvpDefinition } from "./types";

type RuntimeSchema = {
  type?: "object" | "array" | "string" | "integer" | "number" | "boolean";
  enum?: readonly unknown[];
  properties?: Record<string, RuntimeSchema>;
  required?: readonly string[];
  additionalProperties?: boolean;
  items?: RuntimeSchema;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
};

export type ValidationError = {
  path: string;
  message: string;
};

export type MvpDefinitionParseResult =
  | {
      success: true;
      data: MvpDefinition;
    }
  | {
      success: false;
      errors: ValidationError[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function childPath(path: string, key: string): string {
  return path === "$" ? `$.${key}` : `${path}.${key}`;
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function validateValue(
  value: unknown,
  schema: RuntimeSchema,
  path: string,
  errors: ValidationError[],
): void {
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      path,
      message: `次のいずれかである必要があります: ${schema.enum.join(", ")}`,
    });
    return;
  }

  switch (schema.type) {
    case "object": {
      if (!isRecord(value)) {
        errors.push({ path, message: "オブジェクトである必要があります" });
        return;
      }

      const properties = schema.properties ?? {};

      for (const requiredKey of schema.required ?? []) {
        if (!Object.prototype.hasOwnProperty.call(value, requiredKey)) {
          errors.push({
            path: childPath(path, requiredKey),
            message: "必須項目です",
          });
        }
      }

      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.prototype.hasOwnProperty.call(properties, key)) {
            errors.push({
              path: childPath(path, key),
              message: "未定義の項目です",
            });
          }
        }
      }

      for (const [key, propertySchema] of Object.entries(properties)) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          validateValue(
            value[key],
            propertySchema,
            childPath(path, key),
            errors,
          );
        }
      }
      return;
    }
    case "array": {
      if (!Array.isArray(value)) {
        errors.push({ path, message: "配列である必要があります" });
        return;
      }

      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push({
          path,
          message: `${schema.minItems}件以上である必要があります`,
        });
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push({
          path,
          message: `${schema.maxItems}件以下である必要があります`,
        });
      }

      if (schema.items) {
        value.forEach((item, index) => {
          validateValue(item, schema.items!, `${path}[${index}]`, errors);
        });
      }
      return;
    }
    case "string": {
      if (typeof value !== "string") {
        errors.push({ path, message: "文字列である必要があります" });
        return;
      }
      const length = codePointLength(value);

      if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) {
        errors.push({ path, message: "空白だけにはできません" });
      }

      if (schema.minLength !== undefined && length < schema.minLength) {
        errors.push({
          path,
          message: `${schema.minLength}文字以上である必要があります`,
        });
      }
      if (schema.maxLength !== undefined && length > schema.maxLength) {
        errors.push({
          path,
          message: `${schema.maxLength}文字以下である必要があります`,
        });
      }
      return;
    }
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) {
        errors.push({ path, message: "整数である必要があります" });
        return;
      }
      break;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push({ path, message: "有限の数値である必要があります" });
        return;
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") {
        errors.push({ path, message: "真偽値である必要があります" });
      }
      return;
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        path,
        message: `${schema.minimum}以上である必要があります`,
      });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        path,
        message: `${schema.maximum}以下である必要があります`,
      });
    }
  }
}

export function parseMvpDefinition(value: unknown): MvpDefinitionParseResult {
  const errors: ValidationError[] = [];

  validateValue(
    value,
    mvpDefinitionSchema as RuntimeSchema,
    "$",
    errors,
  );

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: value as MvpDefinition };
}

export function parseMvpDefinitionJson(json: string): MvpDefinitionParseResult {
  try {
    return parseMvpDefinition(JSON.parse(json));
  } catch {
    return {
      success: false,
      errors: [{ path: "$", message: "有効なJSONではありません" }],
    };
  }
}

export function isMvpDefinition(value: unknown): value is MvpDefinition {
  return parseMvpDefinition(value).success;
}
