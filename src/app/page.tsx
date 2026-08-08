"use client";

import { FormEvent, useRef, useState } from "react";
import { MvpDefinitionResult } from "@/components/mvp-definition-result";
import { isMvpDefinition, type MvpDefinition } from "@/lib/mvp-definition";

const IDEA_MIN_LENGTH = 20;
const FIELD_MAX_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 180_000;

type FormErrors = {
  idea?: string;
  constraints?: string;
};

type GenerationErrorCode =
  | "configuration_error"
  | "generation_timeout"
  | "invalid_model_response"
  | "invalid_request"
  | "rate_limited"
  | "upstream_error";

type GenerationErrorResponse = {
  error?: { code?: unknown; message?: unknown };
};

function getCharacterCount(value: string): number {
  return Array.from(value).length;
}

function validateIdea(value: string): string | undefined {
  const trimmedValue = value.trim();

  if (getCharacterCount(trimmedValue) === 0) {
    return "アプリアイデアを入力してください。";
  }

  if (getCharacterCount(trimmedValue) < IDEA_MIN_LENGTH) {
    return `アプリアイデアは${IDEA_MIN_LENGTH}文字以上で入力してください。`;
  }

  if (getCharacterCount(value) > FIELD_MAX_LENGTH) {
    return `アプリアイデアは${FIELD_MAX_LENGTH}文字以内で入力してください。`;
  }
}

function validateConstraints(value: string): string | undefined {
  if (getCharacterCount(value) > FIELD_MAX_LENGTH) {
    return `制約・希望条件は${FIELD_MAX_LENGTH}文字以内で入力してください。`;
  }
}

function messageForGenerationError(code: GenerationErrorCode | undefined): string {
  switch (code) {
    case "rate_limited":
      return "現在リクエストが集中しています。少し待ってから再試行してください。";
    case "generation_timeout":
      return "生成に時間がかかっています。時間をおいて再試行してください。";
    case "invalid_model_response":
      return "生成結果を処理できませんでした。もう一度お試しください。";
    case "upstream_error":
      return "生成サービスとの通信に失敗しました。時間をおいて再試行してください。";
    case "configuration_error":
      return "生成サービスの設定が完了していません。時間をおいて再試行してください。";
    case "invalid_request":
      return "入力内容を確認できませんでした。入力内容を見直して再試行してください。";
    default:
      return "通信に失敗しました。接続を確認して再試行してください。";
  }
}

function getErrorCode(value: unknown): GenerationErrorCode | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const knownCodes: GenerationErrorCode[] = [
    "configuration_error",
    "generation_timeout",
    "invalid_model_response",
    "invalid_request",
    "rate_limited",
    "upstream_error",
  ];
  return knownCodes.includes(value as GenerationErrorCode)
    ? (value as GenerationErrorCode)
    : undefined;
}

function FeedbackLink() {
  return (
    <aside className="feedback-notice" aria-label="ご意見・不具合報告">
      <p>
        不具合報告・改善要望・お問い合わせがありましたら、ぜひGitHub Issuesでの起票をお願いします。
      </p>
      <a
        href="https://github.com/mytysoldier/ai-app-incubator/issues/new"
        rel="noreferrer"
        target="_blank"
      >
        ご意見・不具合報告を送る
      </a>
      <p className="feedback-notice-caution">
        APIキー、個人情報、生成結果に含まれる機微情報は投稿しないでください。
      </p>
    </aside>
  );
}

export default function Home() {
  const [idea, setIdea] = useState("");
  const [constraints, setConstraints] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [definition, setDefinition] = useState<MvpDefinition | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const requestId = useRef(0);
  const ideaCharacterCount = getCharacterCount(idea);
  const constraintsCharacterCount = getCharacterCount(constraints);

  async function submitGeneration() {
    const nextErrors = {
      idea: validateIdea(idea),
      constraints: validateConstraints(constraints),
    };
    setErrors(nextErrors);

    if (nextErrors.idea || nextErrors.constraints) {
      return;
    }

    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    setIsSubmitting(true);
    setGenerationError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea, constraints }),
        signal: controller.signal,
      });
      const responseBody: unknown = await response.json().catch(() => undefined);

      if (currentRequestId !== requestId.current) {
        return;
      }

      if (!response.ok) {
        const errorBody = responseBody as GenerationErrorResponse | undefined;
        setGenerationError(messageForGenerationError(getErrorCode(errorBody?.error?.code)));
        return;
      }

      if (
        typeof responseBody !== "object" ||
        responseBody === null ||
        !("data" in responseBody) ||
        !isMvpDefinition(responseBody.data)
      ) {
        setGenerationError(messageForGenerationError("invalid_model_response"));
        return;
      }

      setDefinition(responseBody.data);
    } catch (error) {
      if (currentRequestId !== requestId.current) {
        return;
      }
      setGenerationError(
        error instanceof DOMException && error.name === "AbortError"
          ? messageForGenerationError("generation_timeout")
          : messageForGenerationError(undefined),
      );
    } finally {
      window.clearTimeout(timeout);
      if (currentRequestId === requestId.current) {
        setIsSubmitting(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitGeneration();
  }

  function handleIdeaChange(value: string) {
    setIdea(value);

    if (errors.idea) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        idea: validateIdea(value),
      }));
    }
  }

  function handleConstraintsChange(value: string) {
    setConstraints(value);

    if (errors.constraints) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        constraints: validateConstraints(value),
      }));
    }
  }

  function handleRegenerate() {
    requestId.current += 1;
    setDefinition(null);
    setGenerationError(null);
  }

  if (definition) {
    return (
      <main className="page-shell">
        <div className="content">
          <MvpDefinitionResult definition={definition} onRegenerate={handleRegenerate} />
          <FeedbackLink />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="content">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">AI APP INCUBATOR</p>
          <h1 id="page-title">アイデアを、実装できるMVPへ。</h1>
          <p className="description">
            アプリアイデアを入力すると、公開に向けたMVPの定義書を整理します。
          </p>
        </section>

        <section className="how-to" aria-labelledby="how-to-title">
          <h2 id="how-to-title">使い方</h2>
          <ol>
            <li>実現したいアプリのアイデアを具体的に入力します。</li>
            <li>予算や期限など、あれば制約・希望条件を追加します。</li>
            <li>生成ボタンからMVPの定義書を作成します。</li>
          </ol>
        </section>

        <p aria-live="polite" className="generation-status">
          {isSubmitting ? "MVP定義書を生成しています。完了までお待ちください。" : ""}
        </p>
        <form
          aria-label="MVP定義書生成フォーム"
          aria-busy={isSubmitting}
          className="idea-form"
          noValidate
          onSubmit={handleSubmit}
        >
          {generationError && (
            <div className="generation-error" role="alert">
              <p>{generationError}</p>
              <button className="secondary-button" onClick={() => void submitGeneration()} type="button">
                再試行する
              </button>
            </div>
          )}
          <div className="form-field">
            <div className="field-heading">
              <label htmlFor="idea">アプリアイデア</label>
              <span className="required" aria-hidden="true">必須</span>
            </div>
            <p id="idea-hint" className="field-hint">
              どんな人の、どんな課題を解決したいかを書いてください。20〜2,000文字。
            </p>
            <textarea
              aria-describedby={errors.idea ? "idea-hint idea-error" : "idea-hint"}
              aria-invalid={Boolean(errors.idea)}
              id="idea"
              name="idea"
              onChange={(event) => handleIdeaChange(event.target.value)}
              placeholder="例：忙しい個人開発者が、週末だけで公開できるアプリ案を整理できるサービス"
              required
              rows={7}
              value={idea}
            />
            <div className="field-footer">
              {errors.idea ? <p id="idea-error" className="field-error" role="alert">{errors.idea}</p> : <span />}
              <p className="character-count" aria-live="polite">{ideaCharacterCount} / {FIELD_MAX_LENGTH}文字</p>
            </div>
          </div>

          <div className="form-field">
            <div className="field-heading">
              <label htmlFor="constraints">制約・希望条件</label>
              <span className="optional">任意</span>
            </div>
            <p id="constraints-hint" className="field-hint">
              使いたい技術、予算、期限、避けたい機能などがあれば入力してください。最大2,000文字。
            </p>
            <textarea
              aria-describedby={errors.constraints ? "constraints-hint constraints-error" : "constraints-hint"}
              aria-invalid={Boolean(errors.constraints)}
              id="constraints"
              name="constraints"
              onChange={(event) => handleConstraintsChange(event.target.value)}
              placeholder="例：Next.jsで作りたい。1週間で公開できる範囲にしたい。"
              rows={5}
              value={constraints}
            />
            <div className="field-footer">
              {errors.constraints ? <p id="constraints-error" className="field-error" role="alert">{errors.constraints}</p> : <span />}
              <p className="character-count" aria-live="polite">{constraintsCharacterCount} / {FIELD_MAX_LENGTH}文字</p>
            </div>
          </div>

          <aside className="privacy-notice" aria-label="入力内容に関する注意">
            <p>入力内容はMVP定義書の生成のためGemini APIへ送信されます。入力内容と生成結果は保存しません。</p>
            <p>個人情報、APIキー、パスワード、その他の秘密情報は入力しないでください。</p>
          </aside>

          <button className="submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "生成しています…" : "MVPの定義書を生成する"}
          </button>
        </form>
        <FeedbackLink />
      </div>
    </main>
  );
}
