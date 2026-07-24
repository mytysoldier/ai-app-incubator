export const MVP_DEFINITION_LIMITS = {
  shortText: 160,
  text: 1_200,
  listItems: 12,
  appNameCandidates: 5,
  features: 10,
  screens: 10,
  inputOutputItems: 20,
  dataModels: 8,
  dataModelFields: 20,
  apisAndServices: 10,
  techStackItems: 12,
  technicalRisks: 10,
  implementationTasks: 14,
  taskCompletionCriteria: 8,
} as const;

const shortText = {
  type: "string",
  minLength: 1,
  maxLength: MVP_DEFINITION_LIMITS.shortText,
} as const;

const text = {
  type: "string",
  minLength: 1,
  maxLength: MVP_DEFINITION_LIMITS.text,
} as const;

const stringList = {
  type: "array",
  maxItems: MVP_DEFINITION_LIMITS.listItems,
  items: text,
} as const;

export const mvpDefinitionSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "MVP定義書",
  description:
    "アプリアイデアを公開可能なMVPへ落とし込むための、日本語の構造化された定義書。",
  type: "object",
  additionalProperties: false,
  properties: {
    appNameCandidates: {
      description: "アプリ名候補。",
      type: "array",
      maxItems: MVP_DEFINITION_LIMITS.appNameCandidates,
      items: shortText,
    },
    overview: {
      ...text,
      description: "誰のどの課題を、どのようなMVPで解決するかを示す企画概要。",
    },
    problems: {
      ...stringList,
      description: "MVPで解決する具体的な課題。",
    },
    targetUsers: {
      ...stringList,
      description: "MVPが想定するユーザー。",
    },
    userValues: {
      ...stringList,
      description: "ユーザーがMVPから得られる価値。",
    },
    differentiators: {
      ...stringList,
      description: "既存の方法や代替手段との差別化ポイント。",
    },
    mvpFeatures: {
      description: "MVPに含める機能。",
      type: "array",
      maxItems: MVP_DEFINITION_LIMITS.features,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            ...shortText,
            description: "機能名。",
          },
          description: {
            ...text,
            description: "機能の目的と振る舞い。",
          },
        },
        required: ["name", "description"],
      },
    },
    outOfScope: {
      ...stringList,
      description: "今回のMVPでは作らない機能や対応。",
    },
    screens: {
      description: "MVPで必要な画面。",
      type: "array",
      maxItems: MVP_DEFINITION_LIMITS.screens,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            ...shortText,
            description: "画面名またはルート。",
          },
          purpose: {
            ...text,
            description: "画面の目的。",
          },
          inputItems: {
            ...stringList,
            description: "画面で扱う入力項目。ない場合は省略できる。",
          },
          outputItems: {
            ...stringList,
            description: "画面で表示する出力項目。ない場合は省略できる。",
          },
        },
        required: ["name", "purpose"],
      },
    },
    inputOutputItems: {
      description: "MVP全体で扱う入力項目と出力項目。",
      type: "array",
      maxItems: MVP_DEFINITION_LIMITS.inputOutputItems,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            ...shortText,
            description: "項目名。",
          },
          direction: {
            type: "string",
            enum: ["input", "output"],
            description: "入力項目か出力項目か。",
          },
          required: {
            type: "boolean",
            description: "ユーザー操作または処理上の必須項目か。",
          },
          description: {
            ...text,
            description: "項目の用途、内容、または制約。",
          },
        },
        required: ["name", "direction", "required", "description"],
      },
    },
    dataModels: {
      description: "永続化の有無を問わず、処理で扱う簡易データモデル。",
      type: "array",
      maxItems: MVP_DEFINITION_LIMITS.dataModels,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            ...shortText,
            description: "モデル名。",
          },
          description: {
            ...text,
            description: "モデルの役割。",
          },
          fields: {
            description: "モデルが持つフィールド。未確定の場合は省略できる。",
            type: "array",
            maxItems: MVP_DEFINITION_LIMITS.dataModelFields,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: {
                  ...shortText,
                  description: "フィールド名。",
                },
                type: {
                  ...shortText,
                  description: "概念上のデータ型。",
                },
                required: {
                  type: "boolean",
                  description: "必須フィールドか。",
                },
                description: {
                  ...text,
                  description: "フィールドの用途または制約。",
                },
              },
              required: ["name", "type", "required", "description"],
            },
          },
        },
        required: ["name", "description"],
      },
    },
    apisAndServices: {
      description: "MVPに必要なAPIと外部サービス。",
      type: "array",
      maxItems: MVP_DEFINITION_LIMITS.apisAndServices,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            ...shortText,
            description: "APIまたは外部サービス名。",
          },
          purpose: {
            ...text,
            description: "利用目的。",
          },
          required: {
            type: "boolean",
            description: "MVP公開に必須か。",
          },
        },
        required: ["name", "purpose", "required"],
      },
    },
    techStack: {
      description: "推奨技術スタックと選定理由。",
      type: "array",
      maxItems: MVP_DEFINITION_LIMITS.techStackItems,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: {
            ...shortText,
            description: "Frontend、Hostingなどの分類。",
          },
          choice: {
            ...shortText,
            description: "推奨する技術またはサービス。",
          },
          reason: {
            ...text,
            description: "MVPの速度、公開性、保守性を踏まえた選定理由。",
          },
        },
        required: ["category", "choice", "reason"],
      },
    },
    nonFunctionalRequirements: {
      ...stringList,
      description: "性能、可用性、セキュリティ、操作性などの非機能要件。",
    },
    technicalRisks: {
      description: "実装または運用上の技術的リスクと対策。",
      type: "array",
      maxItems: MVP_DEFINITION_LIMITS.technicalRisks,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          risk: {
            ...text,
            description: "想定されるリスク。",
          },
          impact: {
            ...text,
            description: "リスクが顕在化した場合の影響。",
          },
          mitigation: {
            ...text,
            description: "MVPで行う軽減策。",
          },
        },
        required: ["risk", "impact", "mitigation"],
      },
    },
    assumptions: {
      ...stringList,
      description: "不足情報を補うために置いた仮定。他の結論と分離して記載する。",
    },
    openQuestions: {
      ...stringList,
      description: "実装前または検証中に決める必要がある未決事項。",
    },
    implementationTasks: {
      description: "1〜2週間でMVPを公開するための、順序付き実装タスク。",
      type: "array",
      maxItems: MVP_DEFINITION_LIMITS.implementationTasks,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          order: {
            type: "integer",
            minimum: 1,
            maximum: MVP_DEFINITION_LIMITS.implementationTasks,
            description: "実装順序。",
          },
          title: {
            ...shortText,
            description: "タスク名。",
          },
          description: {
            ...text,
            description: "タスクで実装する範囲。",
          },
          completionCriteria: {
            description: "タスク単位の完了条件。",
            type: "array",
            maxItems: MVP_DEFINITION_LIMITS.taskCompletionCriteria,
            items: text,
          },
        },
        required: ["order", "title", "description", "completionCriteria"],
      },
    },
    completionCriteria: {
      ...stringList,
      description: "MVP全体を完了と判断する条件。",
    },
  },
  required: [
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
  ],
} as const;
