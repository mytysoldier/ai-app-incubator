import type { MvpDefinition } from "./types";

const EMPTY_TEXT = "該当なし";

function normalizeInline(value: string): string {
  return value
    .replace(/\r\n|\r|\n/g, " ")
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_{}\[\]()#+.!|~\-]/g, "\\$&");
}

function renderList(values: readonly string[]): string {
  if (values.length === 0) {
    return EMPTY_TEXT;
  }

  return values.map((value) => `- ${normalizeInline(value)}`).join("\n");
}

function renderBoolean(value: boolean): string {
  return value ? "はい" : "いいえ";
}

export function toMvpDefinitionMarkdown(definition: MvpDefinition): string {
  const sections = [
    `# MVP定義書`,
    `## アプリ名候補\n\n${renderList(definition.appNameCandidates)}`,
    `## 企画概要\n\n${normalizeInline(definition.overview)}`,
    `## 解決する課題\n\n${renderList(definition.problems)}`,
    `## 想定ユーザー\n\n${renderList(definition.targetUsers)}`,
    `## ユーザー価値\n\n${renderList(definition.userValues)}`,
    `## 差別化ポイント\n\n${renderList(definition.differentiators)}`,
    `## MVP機能\n\n${
      definition.mvpFeatures.length === 0
        ? EMPTY_TEXT
        : definition.mvpFeatures
            .map(
              (feature) =>
                `### ${normalizeInline(feature.name)}\n\n${normalizeInline(feature.description)}`,
            )
            .join("\n\n")
    }`,
    `## MVP対象外\n\n${renderList(definition.outOfScope)}`,
    `## 画面一覧\n\n${
      definition.screens.length === 0
        ? EMPTY_TEXT
        : definition.screens
            .map((screen) => {
              const details = [
                normalizeInline(screen.purpose),
                `- 入力項目: ${
                  screen.inputItems?.length
                    ? screen.inputItems.map(normalizeInline).join("、")
                    : EMPTY_TEXT
                }`,
                `- 出力項目: ${
                  screen.outputItems?.length
                    ? screen.outputItems.map(normalizeInline).join("、")
                    : EMPTY_TEXT
                }`,
              ];
              return `### ${normalizeInline(screen.name)}\n\n${details.join("\n\n")}`;
            })
            .join("\n\n")
    }`,
    `## 入力・出力項目\n\n${
      definition.inputOutputItems.length === 0
        ? EMPTY_TEXT
        : definition.inputOutputItems
            .map(
              (item) =>
                `### ${normalizeInline(item.name)}\n\n` +
                `- 区分: ${item.direction === "input" ? "入力" : "出力"}\n` +
                `- 必須: ${renderBoolean(item.required)}\n` +
                `- 内容: ${normalizeInline(item.description)}`,
            )
            .join("\n\n")
    }`,
    `## 簡易データモデル\n\n${
      definition.dataModels.length === 0
        ? EMPTY_TEXT
        : definition.dataModels
            .map((model) => {
              const fields = model.fields?.length
                ? model.fields
                    .map(
                      (field) =>
                        `- ${normalizeInline(field.name)} (${normalizeInline(field.type)} / 必須: ${renderBoolean(field.required)}): ${normalizeInline(field.description)}`,
                    )
                    .join("\n")
                : EMPTY_TEXT;
              return `### ${normalizeInline(model.name)}\n\n${normalizeInline(model.description)}\n\n#### フィールド\n\n${fields}`;
            })
            .join("\n\n")
    }`,
    `## 必要なAPI・外部サービス\n\n${
      definition.apisAndServices.length === 0
        ? EMPTY_TEXT
        : definition.apisAndServices
            .map(
              (service) =>
                `### ${normalizeInline(service.name)}\n\n` +
                `- 必須: ${renderBoolean(service.required)}\n` +
                `- 目的: ${normalizeInline(service.purpose)}`,
            )
            .join("\n\n")
    }`,
    `## 推奨技術スタックと選定理由\n\n${
      definition.techStack.length === 0
        ? EMPTY_TEXT
        : definition.techStack
            .map(
              (item) =>
                `### ${normalizeInline(item.category)}: ${normalizeInline(item.choice)}\n\n${normalizeInline(item.reason)}`,
            )
            .join("\n\n")
    }`,
    `## 非機能要件\n\n${renderList(definition.nonFunctionalRequirements)}`,
    `## 技術的リスク\n\n${
      definition.technicalRisks.length === 0
        ? EMPTY_TEXT
        : definition.technicalRisks
            .map(
              (item, index) =>
                `### リスク${index + 1}\n\n` +
                `- リスク: ${normalizeInline(item.risk)}\n` +
                `- 影響: ${normalizeInline(item.impact)}\n` +
                `- 軽減策: ${normalizeInline(item.mitigation)}`,
            )
            .join("\n\n")
    }`,
    `## 仮定\n\n${renderList(definition.assumptions)}`,
    `## 未決事項\n\n${renderList(definition.openQuestions)}`,
    `## 1〜2週間の実装タスク\n\n${
      definition.implementationTasks.length === 0
        ? EMPTY_TEXT
        : [...definition.implementationTasks]
            .sort((left, right) => left.order - right.order)
            .map(
              (task) =>
                `### ${task.order}. ${normalizeInline(task.title)}\n\n` +
                `${normalizeInline(task.description)}\n\n` +
                `#### 完了条件\n\n${renderList(task.completionCriteria)}`,
            )
            .join("\n\n")
    }`,
    `## 完了条件\n\n${renderList(definition.completionCriteria)}`,
  ];

  return `${sections.join("\n\n")}\n`;
}
