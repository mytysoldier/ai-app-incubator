import type { MvpDefinition } from "./types";

export const completeDefinition = {
  appNameCandidates: ["AI App Incubator"],
  overview: "個人開発のアイデアを、公開可能なMVP定義書へ整理する。",
  problems: ["実装前の要件整理に時間がかかる。"],
  targetUsers: ["短期間でMVPを公開したい個人開発者。"],
  userValues: ["実装可能な粒度の計画をすぐに得られる。"],
  differentiators: ["公開可能性と小さなスコープを優先する。"],
  mvpFeatures: [
    { name: "MVP定義書生成", description: "入力したアイデアから構造化された定義書を生成する。" },
  ],
  outOfScope: ["生成履歴の保存。"],
  screens: [{ name: "/", purpose: "入力と生成結果の確認を1画面で行う。" }],
  inputOutputItems: [{ name: "アプリアイデア", direction: "input", required: true, description: "20〜2,000文字のアイデア本文。" }],
  dataModels: [{ name: "MvpDefinition", description: "生成結果を表すメモリ上のデータ。" }],
  apisAndServices: [{ name: "Gemini API", purpose: "MVP定義書を生成する。", required: true }],
  techStack: [{ category: "Frontend", choice: "Next.js", reason: "1つのプロジェクトで画面とAPIを実装しやすい。" }],
  nonFunctionalRequirements: ["3分以内に生成を完了する。"],
  technicalRisks: [{ risk: "構造化出力がスキーマに違反する。", impact: "結果を表示できない。", mitigation: "サーバー側で応答を検証する。" }],
  assumptions: ["利用者は日本語でアイデアを入力する。"],
  openQuestions: ["代表入力での生成品質を検証する必要がある。"],
  implementationTasks: [{ order: 1, title: "スキーマを実装する", description: "出力構造と検証を実装する。", completionCriteria: ["不正な応答を拒否できる。"] }],
  completionCriteria: ["公開URLからMVP定義書を生成できる。"],
} satisfies MvpDefinition;
