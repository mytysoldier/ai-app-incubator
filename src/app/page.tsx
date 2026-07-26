"use client";

import { FormEvent, useState } from "react";

const IDEA_MIN_LENGTH = 20;
const FIELD_MAX_LENGTH = 2000;

type FormErrors = {
  idea?: string;
  constraints?: string;
};

function validateIdea(value: string): string | undefined {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return "アプリアイデアを入力してください。";
  }

  if (trimmedValue.length < IDEA_MIN_LENGTH) {
    return `アプリアイデアは${IDEA_MIN_LENGTH}文字以上で入力してください。`;
  }

  if (value.length > FIELD_MAX_LENGTH) {
    return `アプリアイデアは${FIELD_MAX_LENGTH}文字以内で入力してください。`;
  }
}

function validateConstraints(value: string): string | undefined {
  if (value.length > FIELD_MAX_LENGTH) {
    return `制約・希望条件は${FIELD_MAX_LENGTH}文字以内で入力してください。`;
  }
}

export default function Home() {
  const [idea, setIdea] = useState("");
  const [constraints, setConstraints] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = {
      idea: validateIdea(idea),
      constraints: validateConstraints(constraints),
    };

    setErrors(nextErrors);

    if (nextErrors.idea || nextErrors.constraints) {
      return;
    }

    // 生成APIは後続Issueで接続する。ここでは二重送信を防ぐUI状態だけを管理する。
    setIsSubmitting(true);
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

        <form className="idea-form" noValidate onSubmit={handleSubmit}>
          <div className="form-field">
            <div className="field-heading">
              <label htmlFor="idea">アプリアイデア</label>
              <span className="required" aria-hidden="true">
                必須
              </span>
            </div>
            <p id="idea-hint" className="field-hint">
              どんな人の、どんな課題を解決したいかを書いてください。20〜2,000文字。
            </p>
            <textarea
              aria-describedby={errors.idea ? "idea-hint idea-error" : "idea-hint"}
              aria-invalid={Boolean(errors.idea)}
              id="idea"
              maxLength={FIELD_MAX_LENGTH}
              minLength={IDEA_MIN_LENGTH}
              name="idea"
              onChange={(event) => handleIdeaChange(event.target.value)}
              placeholder="例：忙しい個人開発者が、週末だけで公開できるアプリ案を整理できるサービス"
              required
              rows={7}
              value={idea}
            />
            <div className="field-footer">
              {errors.idea ? (
                <p id="idea-error" className="field-error" role="alert">
                  {errors.idea}
                </p>
              ) : (
                <span />
              )}
              <p className="character-count" aria-live="polite">
                {idea.length} / {FIELD_MAX_LENGTH}文字
              </p>
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
              aria-describedby={
                errors.constraints
                  ? "constraints-hint constraints-error"
                  : "constraints-hint"
              }
              aria-invalid={Boolean(errors.constraints)}
              id="constraints"
              maxLength={FIELD_MAX_LENGTH}
              name="constraints"
              onChange={(event) => handleConstraintsChange(event.target.value)}
              placeholder="例：Next.jsで作りたい。1週間で公開できる範囲にしたい。"
              rows={5}
              value={constraints}
            />
            <div className="field-footer">
              {errors.constraints ? (
                <p id="constraints-error" className="field-error" role="alert">
                  {errors.constraints}
                </p>
              ) : (
                <span />
              )}
              <p className="character-count" aria-live="polite">
                {constraints.length} / {FIELD_MAX_LENGTH}文字
              </p>
            </div>
          </div>

          <aside className="privacy-notice" aria-label="入力内容に関する注意">
            <p>個人情報、APIキー、パスワード、その他の秘密情報は入力しないでください。</p>
          </aside>

          <button className="submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "生成を準備しています…" : "MVPの定義書を生成する"}
          </button>
        </form>
      </div>
    </main>
  );
}
