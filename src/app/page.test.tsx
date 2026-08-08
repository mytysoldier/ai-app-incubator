import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { completeDefinition } from "@/lib/mvp-definition/test-fixtures";
import Home from "./page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Home", () => {
  it("renders the input form and privacy notice", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "アイデアを、実装できるMVPへ。",
      }),
    ).toBeDefined();
    expect(screen.getByLabelText("アプリアイデア")).toBeDefined();
    expect(screen.getByLabelText("制約・希望条件")).toBeDefined();
    expect(
      screen.getByText(
        "個人情報、APIキー、パスワード、その他の秘密情報は入力しないでください。",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "入力内容はMVP定義書の生成のためGemini APIへ送信されます。入力内容と生成結果は保存しません。",
      ),
    ).toBeDefined();
  });

  it("links to GitHub Issues for feedback in a new tab with a safety notice", () => {
    render(<Home />);

    const feedbackLink = screen.getByRole("link", { name: "ご意見・不具合報告を送る" });
    expect(
      screen.getByText(
        "不具合報告・改善要望・お問い合わせがありましたら、ぜひGitHub Issuesでの起票をお願いします。",
      ),
    ).toBeDefined();
    expect(feedbackLink.getAttribute("href")).toBe(
      "https://github.com/mytysoldier/ai-app-incubator/issues/new",
    );
    expect(feedbackLink.getAttribute("target")).toBe("_blank");
    expect(feedbackLink.getAttribute("rel")).toBe("noreferrer");
    expect(
      screen.getByText(
        "APIキー、個人情報、生成結果に含まれる機微情報は投稿しないでください。",
      ),
    ).toBeDefined();
  });

  it("shows an associated error for an empty idea", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "MVPの定義書を生成する" }));

    const idea = screen.getByLabelText("アプリアイデア");
    expect(screen.getByRole("alert").textContent).toBe(
      "アプリアイデアを入力してください。",
    );
    expect(idea.getAttribute("aria-invalid")).toBe("true");
    expect(idea.getAttribute("aria-describedby")).toBe("idea-hint idea-error");
  });

  it("enforces the minimum idea length and shows character counts", () => {
    render(<Home />);

    const idea = screen.getByLabelText("アプリアイデア");
    fireEvent.change(idea, { target: { value: "短いアイデアです" } });
    fireEvent.click(screen.getByRole("button", { name: "MVPの定義書を生成する" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "アプリアイデアは20文字以上で入力してください。",
    );
    expect(screen.getByText("8 / 2000文字")).toBeDefined();
  });

  it("counts emoji by Unicode code point for validation and character counts", () => {
    render(<Home />);

    const idea = screen.getByLabelText("アプリアイデア");
    fireEvent.change(idea, { target: { value: "😀".repeat(19) } });
    fireEvent.click(screen.getByRole("button", { name: "MVPの定義書を生成する" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "アプリアイデアは20文字以上で入力してください。",
    );
    expect(screen.getByText("19 / 2000文字")).toBeDefined();

    fireEvent.change(idea, { target: { value: "😀".repeat(20) } });
    expect(screen.getByText("20 / 2000文字")).toBeDefined();
    expect(idea.getAttribute("maxlength")).toBeNull();
  });

  it("rejects more than 2,000 emoji in the optional constraints", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("アプリアイデア"), {
      target: { value: "忙しい個人開発者が週末でアプリ案を整理できるサービス" },
    });
    fireEvent.change(screen.getByLabelText("制約・希望条件"), {
      target: { value: "😀".repeat(2001) },
    });
    fireEvent.click(screen.getByRole("button", { name: "MVPの定義書を生成する" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "制約・希望条件は2000文字以内で入力してください。",
    );
    expect(screen.getByText("2001 / 2000文字")).toBeDefined();
  });

  it("submits validated input, moves focus to the result, and keeps input for regeneration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: completeDefinition }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);

    const idea = screen.getByLabelText("アプリアイデア");
    fireEvent.change(idea, {
      target: { value: "忙しい個人開発者が週末でアプリ案を整理できるサービス" },
    });
    fireEvent.click(screen.getByRole("button", { name: "MVPの定義書を生成する" }));

    const result = await screen.findByRole("heading", { name: "MVP定義書" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generate",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => {
      expect(result.closest("section")).toBe(document.activeElement);
    });

    fireEvent.click(screen.getByRole("button", { name: "もう一度生成する" }));
    expect(screen.getByLabelText("アプリアイデア")).toHaveProperty(
      "value",
      "忙しい個人開発者が週末でアプリ案を整理できるサービス",
    );
  });

  it("announces generation progress to assistive technology", async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () => new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
      ),
    );
    render(<Home />);

    fireEvent.change(screen.getByLabelText("アプリアイデア"), {
      target: { value: "忙しい個人開発者が週末でアプリ案を整理できるサービス" },
    });
    fireEvent.click(screen.getByRole("button", { name: "MVPの定義書を生成する" }));

    const generationStatus = screen.getByText(
      "MVP定義書を生成しています。完了までお待ちください。",
    );
    const form = screen.getByRole("form");
    expect(generationStatus.closest("form")).toBeNull();
    expect(form.getAttribute("aria-busy")).toBe("true");

    resolveRequest?.(new Response(JSON.stringify({ data: completeDefinition }), { status: 200 }));
    expect(await screen.findByRole("heading", { name: "MVP定義書" })).toBeDefined();
  });

  it("shows rate limit guidance and allows retrying without losing the input", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: "rate_limited" } }),
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: completeDefinition }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);

    const idea = screen.getByLabelText("アプリアイデア");
    fireEvent.change(idea, {
      target: { value: "忙しい個人開発者が週末でアプリ案を整理できるサービス" },
    });
    fireEvent.click(screen.getByRole("button", { name: "MVPの定義書を生成する" }));

    expect((await screen.findByRole("alert")).textContent).toContain("少し待ってから再試行");
    expect(idea).toHaveProperty("value", "忙しい個人開発者が週末でアプリ案を整理できるサービス");

    fireEvent.click(screen.getByRole("button", { name: "再試行する" }));
    expect(await screen.findByRole("heading", { name: "MVP定義書" })).toBeDefined();
  });
});
