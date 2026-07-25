import { describe, expect, it } from "vitest";
import {
  MVP_DEFINITION_LIMITS,
  isMvpDefinition,
  mvpDefinitionSchema,
  parseMvpDefinition,
  parseMvpDefinitionJson,
  toMvpDefinitionMarkdown,
  type MvpDefinition,
} from ".";

const completeDefinition = {
  appNameCandidates: ["AI App Incubator"],
  overview: "個人開発のアイデアを、公開可能なMVP定義書へ整理する。",
  problems: ["実装前の要件整理に時間がかかる。"],
  targetUsers: ["短期間でMVPを公開したい個人開発者。"],
  userValues: ["実装可能な粒度の計画をすぐに得られる。"],
  differentiators: ["公開可能性と小さなスコープを優先する。"],
  mvpFeatures: [
    {
      name: "MVP定義書生成",
      description: "入力したアイデアから構造化された定義書を生成する。",
    },
  ],
  outOfScope: ["生成履歴の保存。"],
  screens: [
    {
      name: "/",
      purpose: "入力と生成結果の確認を1画面で行う。",
      inputItems: ["アプリアイデア", "制約・希望条件"],
      outputItems: ["MVP定義書"],
    },
  ],
  inputOutputItems: [
    {
      name: "アプリアイデア",
      direction: "input",
      required: true,
      description: "20〜2,000文字のアイデア本文。",
    },
    {
      name: "MVP定義書",
      direction: "output",
      required: true,
      description: "構造化された日本語の定義書。",
    },
  ],
  dataModels: [
    {
      name: "MvpDefinition",
      description: "生成結果を表すメモリ上のデータ。",
      fields: [
        {
          name: "overview",
          type: "string",
          required: true,
          description: "企画概要。",
        },
      ],
    },
  ],
  apisAndServices: [
    {
      name: "Gemini API",
      purpose: "MVP定義書を生成する。",
      required: true,
    },
  ],
  techStack: [
    {
      category: "Frontend",
      choice: "Next.js",
      reason: "1つのプロジェクトで画面とAPIを実装しやすい。",
    },
  ],
  nonFunctionalRequirements: ["3分以内に生成を完了する。"],
  technicalRisks: [
    {
      risk: "構造化出力がスキーマに違反する。",
      impact: "結果を表示できない。",
      mitigation: "サーバー側で応答を検証する。",
    },
  ],
  assumptions: ["利用者は日本語でアイデアを入力する。"],
  openQuestions: ["代表入力での生成品質を検証する必要がある。"],
  implementationTasks: [
    {
      order: 1,
      title: "スキーマを実装する",
      description: "出力構造と検証を実装する。",
      completionCriteria: ["不正な応答を拒否できる。"],
    },
  ],
  completionCriteria: ["公開URLからMVP定義書を生成できる。"],
} satisfies MvpDefinition;

const minimalDefinition = {
  appNameCandidates: [],
  overview: "最小の企画概要。",
  problems: [],
  targetUsers: [],
  userValues: [],
  differentiators: [],
  mvpFeatures: [],
  outOfScope: [],
  screens: [
    {
      name: "/",
      purpose: "トップ画面。",
    },
  ],
  inputOutputItems: [],
  dataModels: [
    {
      name: "MemoryState",
      description: "メモリ上だけで扱う状態。",
    },
  ],
  apisAndServices: [],
  techStack: [],
  nonFunctionalRequirements: [],
  technicalRisks: [],
  assumptions: [],
  openQuestions: [],
  implementationTasks: [],
  completionCriteria: [],
} satisfies MvpDefinition;

describe("mvpDefinitionSchema", () => {
  it("contains every output item from Issue #1 in a fixed order", () => {
    expect(mvpDefinitionSchema.required).toEqual([
      "appNameCandidates",
      "overview",
      "problems",
      "targetUsers",
      "userValues",
      "differentiators",
      "mvpFeatures",
      "outOfScope",
      "screens",
      "inputOutputItems",
      "dataModels",
      "apisAndServices",
      "techStack",
      "nonFunctionalRequirements",
      "technicalRisks",
      "assumptions",
      "openQuestions",
      "implementationTasks",
      "completionCriteria",
    ]);
    expect(Object.keys(mvpDefinitionSchema.properties)).toEqual(
      mvpDefinitionSchema.required,
    );
  });

  it("accepts complete and minimal definitions", () => {
    expect(isMvpDefinition(completeDefinition)).toBe(true);
    expect(isMvpDefinition(minimalDefinition)).toBe(true);
  });

  it("accepts values exactly at the string and array limits", () => {
    const boundaryDefinition: MvpDefinition = {
      ...minimalDefinition,
      overview: "あ".repeat(MVP_DEFINITION_LIMITS.text),
      problems: Array.from(
        { length: MVP_DEFINITION_LIMITS.listItems },
        () => "課題",
      ),
    };

    expect(parseMvpDefinition(boundaryDefinition)).toEqual({
      success: true,
      data: boundaryDefinition,
    });
  });

  it("counts string limits by Unicode code point", () => {
    const validDefinition: MvpDefinition = {
      ...minimalDefinition,
      overview: "😀".repeat(1_000),
    };
    const tooLongDefinition: MvpDefinition = {
      ...minimalDefinition,
      overview: "😀".repeat(MVP_DEFINITION_LIMITS.text + 1),
    };

    expect(parseMvpDefinition(validDefinition).success).toBe(true);
    expect(parseMvpDefinition(tooLongDefinition).success).toBe(false);
  });

  it("rejects missing, unknown, oversized, and invalid nested values", () => {
    const result = parseMvpDefinition({
      ...completeDefinition,
      overview: "あ".repeat(MVP_DEFINITION_LIMITS.text + 1),
      unexpected: true,
      inputOutputItems: [
        {
          name: "不正な項目",
          direction: "sideways",
          required: "yes",
          description: "不正な値を含む。",
        },
      ],
      assumptions: undefined,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Invalid definition unexpectedly passed validation");
    }

    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining([
        "$.overview",
        "$.unexpected",
        "$.inputOutputItems[0].direction",
        "$.inputOutputItems[0].required",
        "$.assumptions",
      ]),
    );
  });

  it("safely rejects malformed JSON", () => {
    expect(parseMvpDefinitionJson("{")).toEqual({
      success: false,
      errors: [{ path: "$", message: "有効なJSONではありません" }],
    });
  });
});

describe("toMvpDefinitionMarkdown", () => {
  it("renders every section in a fixed heading order", () => {
    const markdown = toMvpDefinitionMarkdown(completeDefinition);
    const headings = markdown
      .split("\n")
      .filter((line) => line.startsWith("## "));

    expect(headings).toEqual([
      "## アプリ名候補",
      "## 企画概要",
      "## 解決する課題",
      "## 想定ユーザー",
      "## ユーザー価値",
      "## 差別化ポイント",
      "## MVP機能",
      "## MVP対象外",
      "## 画面一覧",
      "## 入力・出力項目",
      "## 簡易データモデル",
      "## 必要なAPI・外部サービス",
      "## 推奨技術スタックと選定理由",
      "## 非機能要件",
      "## 技術的リスク",
      "## 仮定",
      "## 未決事項",
      "## 1〜2週間の実装タスク",
      "## 完了条件",
    ]);
    expect(markdown).toContain("#### フィールド");
    expect(markdown).toContain("#### 完了条件");
  });

  it("renders empty arrays and omitted optional fields without throwing", () => {
    expect(() => toMvpDefinitionMarkdown(minimalDefinition)).not.toThrow();

    const markdown = toMvpDefinitionMarkdown(minimalDefinition);
    expect(markdown).toContain("## アプリ名候補\n\n該当なし");
    expect(markdown).toContain("- 入力項目: 該当なし");
    expect(markdown).toContain("#### フィールド\n\n該当なし");
  });

  it("normalizes free text so it cannot add Markdown headings", () => {
    const unexpectedHeading = "## 意図しない見出し";
    const definition: MvpDefinition = {
      ...completeDefinition,
      overview: `概要\n${unexpectedHeading}`,
      mvpFeatures: [
        {
          name: "機能",
          description: `機能説明\n${unexpectedHeading}`,
        },
      ],
      screens: [
        {
          name: "/",
          purpose: `画面目的\n${unexpectedHeading}`,
        },
      ],
      inputOutputItems: [
        {
          name: "入力",
          direction: "input",
          required: true,
          description: `項目説明\n${unexpectedHeading}`,
        },
      ],
      dataModels: [
        {
          name: "モデル",
          description: `モデル説明\n${unexpectedHeading}`,
        },
      ],
      apisAndServices: [
        {
          name: "サービス",
          purpose: `用途\n${unexpectedHeading}`,
          required: true,
        },
      ],
      techStack: [
        {
          category: "Frontend",
          choice: "Next.js",
          reason: `選定理由\n${unexpectedHeading}`,
        },
      ],
      technicalRisks: [
        {
          risk: `リスク\n${unexpectedHeading}`,
          impact: `影響\n${unexpectedHeading}`,
          mitigation: `軽減策\n${unexpectedHeading}`,
        },
      ],
      implementationTasks: [
        {
          order: 1,
          title: "タスク",
          description: `タスク説明\n${unexpectedHeading}`,
          completionCriteria: [],
        },
      ],
    };

    const markdown = toMvpDefinitionMarkdown(definition);

    expect(markdown).not.toContain(`\n${unexpectedHeading}`);
    expect(markdown).toContain(`概要 ${unexpectedHeading}`);
  });

  it.each(["\n", "\r\n", "\r"])(
    "normalizes the %j line ending in free text",
    (lineEnding) => {
      const unexpectedHeading = "## 意図しない見出し";
      const markdown = toMvpDefinitionMarkdown({
        ...minimalDefinition,
        overview: `概要${lineEnding}${unexpectedHeading}`,
      });

      expect(markdown).not.toContain(`\n${unexpectedHeading}`);
      expect(markdown).toContain(`概要 ${unexpectedHeading}`);
    },
  );

  it("does not mutate task order while rendering tasks by order", () => {
    const definition: MvpDefinition = {
      ...minimalDefinition,
      implementationTasks: [
        {
          order: 2,
          title: "後のタスク",
          description: "後で実施する。",
          completionCriteria: [],
        },
        {
          order: 1,
          title: "先のタスク",
          description: "先に実施する。",
          completionCriteria: [],
        },
      ],
    };

    const markdown = toMvpDefinitionMarkdown(definition);

    expect(markdown.indexOf("### 1. 先のタスク")).toBeLessThan(
      markdown.indexOf("### 2. 後のタスク"),
    );
    expect(definition.implementationTasks[0].order).toBe(2);
  });
});
