import {
  MVP_DEFINITION_LIMITS,
  parseMvpDefinition,
  type MvpDefinition,
} from "../mvp-definition";

export const GEMINI_PROMPT_CONFIG = {
  model: "gemini-3.1-flash-lite",
  thinkingLevel: "minimal",
  maxOutputTokens: 3_000,
  maxInputTokensTarget: 6_000,
} as const;

export const MVP_DEFINITION_SYSTEM_INSTRUCTION = `あなたは個人開発者向けのMVP企画支援者です。入力されたアプリアイデアを、日本語の公開可能なMVP定義書へ整理してください。

必ず与えられたJSON Schemaだけに従い、JSON以外は出力しないでください。各項目は次の目的で使い分けてください。
- appNameCandidatesはアプリ名候補、overviewは誰のどの課題をどう解決するMVPか、problems・targetUsers・userValues・differentiatorsはそれぞれ課題・想定ユーザー・価値・差別化を記す。
- mvpFeaturesは公開に必要な機能名と目的、outOfScopeは今回作らないものを記す。screensは画面名、目的、必要に応じた入力項目・出力項目を記す。
- inputOutputItemsは項目名、inputかoutputか、必須か、用途または制約を記す。dataModelsはモデル名、役割、必要に応じたフィールド名・型・必須か・用途を記す。
- apisAndServicesはAPI・外部サービス名、利用目的、公開に必須かを記す。techStackは分類、選択、MVPに適する理由を記す。
- nonFunctionalRequirementsは性能・可用性・セキュリティ・操作性など、technicalRisksはリスク・影響・軽減策を記す。assumptionsは置いた仮定、openQuestionsは未決事項を記す。
- implementationTasksは実装順、タスク名、実装範囲、検証可能な完了条件を記す。completionCriteriaはMVP全体の完了条件を記す。

ローカル検証と一致させるため、空文字列や空白だけの文字列は使わないでください。短い名前・分類・型は${MVP_DEFINITION_LIMITS.shortText}文字以内、それ以外の文章は${MVP_DEFINITION_LIMITS.text}文字以内にしてください。配列は原則${MVP_DEFINITION_LIMITS.listItems}件以内とし、appNameCandidatesは${MVP_DEFINITION_LIMITS.appNameCandidates}件、mvpFeaturesとscreensは各${MVP_DEFINITION_LIMITS.features}件、inputOutputItemsは${MVP_DEFINITION_LIMITS.inputOutputItems}件、dataModelsは${MVP_DEFINITION_LIMITS.dataModels}件、各モデルのfieldsは${MVP_DEFINITION_LIMITS.dataModelFields}件、apisAndServicesは${MVP_DEFINITION_LIMITS.apisAndServices}件、techStackは${MVP_DEFINITION_LIMITS.techStackItems}件、technicalRisksは${MVP_DEFINITION_LIMITS.technicalRisks}件、implementationTasksは${MVP_DEFINITION_LIMITS.implementationTasks}件、各タスクのcompletionCriteriaは${MVP_DEFINITION_LIMITS.taskCompletionCriteria}件までにしてください。implementationTasksのorderは1から${MVP_DEFINITION_LIMITS.implementationTasks}の連番にしてください。

次のルールを守ってください。
- すべての値を自然な日本語で書く。固有名詞や技術名以外の英語は必要最小限にする。
- 入力にない事実は断定しない。不足情報はassumptionsまたはopenQuestionsへ分離する。
- 同じ内容を複数の項目へ繰り返さない。各項目は固有の判断を短く具体的に書く。
- MVPは1〜2週間で公開できる最小範囲に絞る。ログイン、課金、管理画面、履歴、複雑な自動化、独自インフラを、明確な根拠なしに追加しない。
- mvpFeaturesには公開に必要な機能だけを入れ、作らない機能はoutOfScopeへ明確に分ける。
- techStackのreasonには、実装速度、公開しやすさ、保守性のいずれかに基づく理由を書く。
- implementationTasksはorderを1から連番にし、各タスクに検証可能なcompletionCriteriaを含める。
- 空の配列は、入力から妥当な内容を判断できない場合だけ使う。`;

export type MvpDefinitionPromptInput = {
  idea: string;
  constraints?: string;
};

export function createMvpDefinitionUserPrompt({
  idea,
  constraints,
}: MvpDefinitionPromptInput): string {
  const normalizedIdea = idea.trim();
  const normalizedConstraints = constraints?.trim();

  return [
    "次のアプリアイデアをMVP定義書へ整理してください。",
    "# アプリアイデア",
    normalizedIdea,
    "# 制約・希望条件",
    normalizedConstraints || "指定なし。必要な仮定はassumptionsへ明記する。",
  ].join("\n\n");
}

export const GEMINI_FLASH_LITE_PRICING = {
  inputUsdPerMillionTokens: 0.25,
  outputIncludingThinkingUsdPerMillionTokens: 1.5,
  japaneseYenPerUsd: 160,
  sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
  checkedOn: "2026-07-25",
} as const;

const GEMINI_FLASH_LITE_COST_YEN_UNITS = {
  inputToken: 1,
  outputTokenIncludingThinking: 6,
  perYen: 25_000,
} as const;

export type GeminiTokenUsage = {
  inputTokens: number;
  /** Gemini pricing includes thinking tokens in output tokens. */
  outputTokensIncludingThinking: number;
};

export function estimateGeminiGenerationCostYen(
  usage: GeminiTokenUsage,
): number {
  const inputCostUsd =
    (usage.inputTokens / 1_000_000) *
    GEMINI_FLASH_LITE_PRICING.inputUsdPerMillionTokens;
  const outputCostUsd =
    (usage.outputTokensIncludingThinking / 1_000_000) *
    GEMINI_FLASH_LITE_PRICING.outputIncludingThinkingUsdPerMillionTokens;

  return (inputCostUsd + outputCostUsd) * GEMINI_FLASH_LITE_PRICING.japaneseYenPerUsd;
}

export type MvpDefinitionQualityCheck = {
  criterion: string;
  passed: boolean;
};

export type MvpDefinitionEvaluation = {
  schemaValid: boolean;
  checks: MvpDefinitionQualityCheck[];
  passed: boolean;
};

export type MvpDefinitionEvaluationSample = {
  id: string;
  value: unknown;
  usage: GeminiTokenUsage;
};

export type MvpDefinitionBatchEvaluation = {
  sampleCount: number;
  hasAtLeastTenSamples: boolean;
  hasUniqueSampleIds: boolean;
  hasValidTokenUsage: boolean;
  passingSampleCount: number;
  averageEstimatedCostYen: number | null;
  isAverageCostUnderOneYen: boolean;
  results: Array<{
    id: string;
    evaluation: MvpDefinitionEvaluation;
    estimatedCostYen: number | null;
  }>;
  passed: boolean;
};

function hasSequentialTasks(definition: MvpDefinition): boolean {
  return definition.implementationTasks.every(
    (task, index) => task.order === index + 1 && task.completionCriteria.length > 0,
  );
}

function hasValidGeminiTokenUsage(usage: GeminiTokenUsage): boolean {
  return (
    Number.isSafeInteger(usage.inputTokens) &&
    usage.inputTokens >= 0 &&
    Number.isSafeInteger(usage.outputTokensIncludingThinking) &&
    usage.outputTokensIncludingThinking >= 0 &&
    Number.isSafeInteger(getGeminiCostYenUnits(usage))
  );
}

function getGeminiCostYenUnits(usage: GeminiTokenUsage): number {
  return (
    usage.inputTokens * GEMINI_FLASH_LITE_COST_YEN_UNITS.inputToken +
    usage.outputTokensIncludingThinking *
      GEMINI_FLASH_LITE_COST_YEN_UNITS.outputTokenIncludingThinking
  );
}

export function evaluateMvpDefinition(value: unknown): MvpDefinitionEvaluation {
  const parsed = parseMvpDefinition(value);

  if (!parsed.success) {
    return {
      schemaValid: false,
      checks: [
        { criterion: "JSON Schemaに準拠している", passed: false },
        { criterion: "MVP機能と対象外が分離されている", passed: false },
        { criterion: "技術選定に理由がある", passed: false },
        { criterion: "実装タスクに順序と完了条件がある", passed: false },
        { criterion: "不足情報が仮定または未決事項として明示されている", passed: false },
      ],
      passed: false,
    };
  }

  const definition = parsed.data;
  const checks: MvpDefinitionQualityCheck[] = [
    { criterion: "JSON Schemaに準拠している", passed: true },
    {
      criterion: "MVP機能と対象外が分離されている",
      passed: definition.mvpFeatures.length > 0 && definition.outOfScope.length > 0,
    },
    {
      criterion: "技術選定に理由がある",
      passed:
        definition.techStack.length > 0 &&
        definition.techStack.every((item) => item.reason.trim().length > 0),
    },
    {
      criterion: "実装タスクに順序と完了条件がある",
      passed:
        definition.implementationTasks.length > 0 && hasSequentialTasks(definition),
    },
    {
      criterion: "不足情報が仮定または未決事項として明示されている",
      passed:
        definition.assumptions.length > 0 || definition.openQuestions.length > 0,
    },
  ];

  return {
    schemaValid: true,
    checks,
    passed: checks.every((check) => check.passed),
  };
}

/**
 * Evaluates recorded outputs for representative prompts without making an API call.
 * The caller supplies the model output and its measured token usage from AI Studio or
 * a later API integration, so this module never needs an API key.
 */
export function evaluateMvpDefinitionBatch(
  samples: ReadonlyArray<MvpDefinitionEvaluationSample>,
): MvpDefinitionBatchEvaluation {
  const results = samples.map((sample) => ({
    id: sample.id,
    evaluation: evaluateMvpDefinition(sample.value),
    estimatedCostYen: hasValidGeminiTokenUsage(sample.usage)
      ? estimateGeminiGenerationCostYen(sample.usage)
      : null,
  }));
  const sampleCount = results.length;
  const totalCostYenUnits = samples.reduce(
    (total, sample) => total + getGeminiCostYenUnits(sample.usage),
    0,
  );
  const hasValidTokenUsage =
    results.every((result) => result.estimatedCostYen !== null) &&
    Number.isSafeInteger(totalCostYenUnits);
  const averageEstimatedCostYen =
    sampleCount === 0 || !hasValidTokenUsage
      ? null
      : results.reduce(
          (total, result) => total + (result.estimatedCostYen ?? 0),
          0,
        ) / sampleCount;
  const hasAtLeastTenSamples = sampleCount >= 10;
  const hasUniqueSampleIds = new Set(results.map((result) => result.id)).size === sampleCount;
  const passingSampleCount = results.filter((result) => result.evaluation.passed).length;
  const isAverageCostUnderOneYen =
    averageEstimatedCostYen !== null &&
    totalCostYenUnits < GEMINI_FLASH_LITE_COST_YEN_UNITS.perYen * sampleCount;

  return {
    sampleCount,
    hasAtLeastTenSamples,
    hasUniqueSampleIds,
    hasValidTokenUsage,
    passingSampleCount,
    averageEstimatedCostYen,
    isAverageCostUnderOneYen,
    results,
    passed:
      hasAtLeastTenSamples &&
      hasUniqueSampleIds &&
      hasValidTokenUsage &&
      passingSampleCount === sampleCount &&
      isAverageCostUnderOneYen,
  };
}
