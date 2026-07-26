import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

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

  it("disables the button while a valid request is being prepared", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("アプリアイデア"), {
      target: { value: "忙しい個人開発者が週末でアプリ案を整理できるサービス" },
    });
    fireEvent.click(screen.getByRole("button", { name: "MVPの定義書を生成する" }));

    expect(
      screen.getByRole("button", { name: "生成を準備しています…" }),
    ).toHaveProperty("disabled", true);
  });
});
