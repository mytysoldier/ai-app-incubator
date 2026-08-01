import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { completeDefinition } from "@/lib/mvp-definition/test-fixtures";
import { toMvpDefinitionMarkdown } from "@/lib/mvp-definition";
import { MvpDefinitionResult } from "./mvp-definition-result";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MvpDefinitionResult", () => {
  it("renders every definition section and separates MVP scope", () => {
    render(<MvpDefinitionResult definition={completeDefinition} onRegenerate={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "MVP定義書" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "MVP機能" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "MVP対象外" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "未決事項" })).toBeDefined();
    expect(screen.getByText("MVP定義書生成")).toBeDefined();
    expect(screen.getByText("生成履歴の保存。")).toBeDefined();
  });

  it("renders empty arrays and omitted optional fields safely", () => {
    const definition = {
      ...completeDefinition,
      appNameCandidates: [],
      mvpFeatures: [],
      screens: [{ name: "/", purpose: "結果を表示する。" }],
      dataModels: [{ name: "Result", description: "生成結果。" }],
    };

    expect(() => render(<MvpDefinitionResult definition={definition} onRegenerate={vi.fn()} />)).not.toThrow();
    expect(screen.getAllByText("該当なし").length).toBeGreaterThan(0);
  });

  it("copies the existing Markdown conversion and gives success feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<MvpDefinitionResult definition={completeDefinition} onRegenerate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Markdownをコピー" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(toMvpDefinitionMarkdown(completeDefinition));
    });
    expect(screen.getByRole("status").textContent).toBe("Markdownをコピーしました。");
  });

  it("shows guidance when copying is unavailable", async () => {
    Object.assign(navigator, { clipboard: undefined });
    render(<MvpDefinitionResult definition={completeDefinition} onRegenerate={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Markdownをコピー" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "コピーできませんでした。",
    );
  });

  it("calls the supplied regenerate handler", () => {
    const onRegenerate = vi.fn();
    render(<MvpDefinitionResult definition={completeDefinition} onRegenerate={onRegenerate} />);

    fireEvent.click(screen.getByRole("button", { name: "もう一度生成する" }));

    expect(onRegenerate).toHaveBeenCalledOnce();
  });
});
