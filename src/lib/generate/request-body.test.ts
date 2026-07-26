import { describe, expect, it } from "vitest";
import { RequestBodyTooLargeError, readBodyWithinLimit } from "./request-body";

function createBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("readBodyWithinLimit", () => {
  it("decodes a request body without exceeding the byte limit", async () => {
    await expect(readBodyWithinLimit(createBody(["あ", "いう"]), 9)).resolves.toBe("あいう");
  });

  it("stops reading as soon as a chunk exceeds the byte limit", async () => {
    await expect(readBodyWithinLimit(createBody(["123", "456"]), 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });
});
