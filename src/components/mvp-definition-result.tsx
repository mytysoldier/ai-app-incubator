"use client";

import { useEffect, useRef, useState } from "react";
import {
  toMvpDefinitionMarkdown,
  type MvpDefinition,
} from "@/lib/mvp-definition";

type MvpDefinitionResultProps = {
  definition: MvpDefinition;
  onRegenerate: () => void;
};

type CopyStatus = "idle" | "success" | "error";

type CopyFeedback = {
  definition: MvpDefinition;
  status: Exclude<CopyStatus, "idle">;
};

const EMPTY_TEXT = "該当なし";

function TextList({ items }: { items: readonly string[] }) {
  if (items.length === 0) {
    return <p className="empty-value">{EMPTY_TEXT}</p>;
  }

  return (
    <ul className="result-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export function MvpDefinitionResult({
  definition,
  onRegenerate,
}: MvpDefinitionResultProps) {
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);
  const copyRequestId = useRef(0);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    resultRef.current?.focus();
  }, []);

  async function handleCopy() {
    const requestId = copyRequestId.current + 1;
    copyRequestId.current = requestId;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(toMvpDefinitionMarkdown(definition));
      if (copyRequestId.current === requestId) {
        setCopyFeedback({ definition, status: "success" });
      }
    } catch {
      if (copyRequestId.current === requestId) {
        setCopyFeedback({ definition, status: "error" });
      }
    }
  }

  const copyStatus = copyFeedback?.definition === definition ? copyFeedback.status : "idle";

  return (
    <section
      aria-labelledby="mvp-definition-title"
      className="mvp-definition-result"
      ref={resultRef}
      tabIndex={-1}
    >
      <div className="result-heading">
        <div>
          <p className="eyebrow">MVP DEFINITION</p>
          <h2 id="mvp-definition-title">MVP定義書</h2>
        </div>
        <div className="result-actions">
          <button className="secondary-button" onClick={onRegenerate} type="button">
            もう一度生成する
          </button>
          <button className="submit-button" onClick={handleCopy} type="button">
            Markdownをコピー
          </button>
        </div>
      </div>

      {copyStatus === "success" && (
        <p className="copy-feedback" role="status">
          Markdownをコピーしました。
        </p>
      )}
      {copyStatus === "error" && (
        <p className="field-error" role="alert">
          コピーできませんでした。ブラウザのコピー機能を確認して、もう一度お試しください。
        </p>
      )}

      <div className="result-sections">
        <section className="result-section">
          <h3>アプリ名候補</h3>
          <TextList items={definition.appNameCandidates} />
        </section>
        <section className="result-section">
          <h3>企画概要</h3>
          <p>{definition.overview}</p>
        </section>
        <section className="result-section">
          <h3>解決する課題</h3>
          <TextList items={definition.problems} />
        </section>
        <section className="result-section">
          <h3>想定ユーザー</h3>
          <TextList items={definition.targetUsers} />
        </section>
        <section className="result-section">
          <h3>ユーザー価値</h3>
          <TextList items={definition.userValues} />
        </section>
        <section className="result-section">
          <h3>差別化ポイント</h3>
          <TextList items={definition.differentiators} />
        </section>
        <section className="result-section result-section-emphasis">
          <h3>MVP機能</h3>
          {definition.mvpFeatures.length === 0 ? (
            <p className="empty-value">{EMPTY_TEXT}</p>
          ) : (
            <div className="result-cards">
              {definition.mvpFeatures.map((feature, index) => (
                <article className="result-card" key={`${feature.name}-${index}`}>
                  <h4>{feature.name}</h4>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="result-section result-section-muted">
          <h3>MVP対象外</h3>
          <TextList items={definition.outOfScope} />
        </section>
        <section className="result-section">
          <h3>画面一覧</h3>
          {definition.screens.length === 0 ? (
            <p className="empty-value">{EMPTY_TEXT}</p>
          ) : (
            <div className="result-cards">
              {definition.screens.map((screen, index) => (
                <article className="result-card" key={`${screen.name}-${index}`}>
                  <h4>{screen.name}</h4>
                  <p>{screen.purpose}</p>
                  <dl className="detail-list">
                    <div>
                      <dt>入力項目</dt>
                      <dd>{screen.inputItems?.join("、") || EMPTY_TEXT}</dd>
                    </div>
                    <div>
                      <dt>出力項目</dt>
                      <dd>{screen.outputItems?.join("、") || EMPTY_TEXT}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="result-section">
          <h3>入力・出力項目</h3>
          {definition.inputOutputItems.length === 0 ? (
            <p className="empty-value">{EMPTY_TEXT}</p>
          ) : (
            <div className="result-cards">
              {definition.inputOutputItems.map((item, index) => (
                <article className="result-card" key={`${item.name}-${index}`}>
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>
                  <dl className="detail-list">
                    <div>
                      <dt>区分</dt>
                      <dd>{item.direction === "input" ? "入力" : "出力"}</dd>
                    </div>
                    <div>
                      <dt>必須</dt>
                      <dd>{item.required ? "はい" : "いいえ"}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="result-section">
          <h3>簡易データモデル</h3>
          {definition.dataModels.length === 0 ? (
            <p className="empty-value">{EMPTY_TEXT}</p>
          ) : (
            <div className="result-cards">
              {definition.dataModels.map((model, index) => (
                <article className="result-card" key={`${model.name}-${index}`}>
                  <h4>{model.name}</h4>
                  <p>{model.description}</p>
                  <h5>フィールド</h5>
                  {model.fields?.length ? (
                    <ul className="result-list">
                      {model.fields.map((field, fieldIndex) => (
                        <li key={`${field.name}-${fieldIndex}`}>
                          {field.name}（{field.type}／必須: {field.required ? "はい" : "いいえ"}）：
                          {field.description}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-value">{EMPTY_TEXT}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="result-section">
          <h3>必要なAPI・外部サービス</h3>
          {definition.apisAndServices.length === 0 ? (
            <p className="empty-value">{EMPTY_TEXT}</p>
          ) : (
            <div className="result-cards">
              {definition.apisAndServices.map((service, index) => (
                <article className="result-card" key={`${service.name}-${index}`}>
                  <h4>{service.name}</h4>
                  <p>{service.purpose}</p>
                  <p className="detail-label">MVPに必須: {service.required ? "はい" : "いいえ"}</p>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="result-section">
          <h3>推奨技術スタックと選定理由</h3>
          {definition.techStack.length === 0 ? (
            <p className="empty-value">{EMPTY_TEXT}</p>
          ) : (
            <div className="result-cards">
              {definition.techStack.map((item, index) => (
                <article className="result-card" key={`${item.category}-${index}`}>
                  <h4>{item.category}: {item.choice}</h4>
                  <p>{item.reason}</p>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="result-section">
          <h3>非機能要件</h3>
          <TextList items={definition.nonFunctionalRequirements} />
        </section>
        <section className="result-section">
          <h3>技術的リスク</h3>
          {definition.technicalRisks.length === 0 ? (
            <p className="empty-value">{EMPTY_TEXT}</p>
          ) : (
            <div className="result-cards">
              {definition.technicalRisks.map((risk, index) => (
                <article className="result-card" key={`${risk.risk}-${index}`}>
                  <h4>リスク{index + 1}</h4>
                  <dl className="detail-list">
                    <div><dt>リスク</dt><dd>{risk.risk}</dd></div>
                    <div><dt>影響</dt><dd>{risk.impact}</dd></div>
                    <div><dt>軽減策</dt><dd>{risk.mitigation}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="result-section result-section-muted">
          <h3>仮定</h3>
          <TextList items={definition.assumptions} />
        </section>
        <section className="result-section result-section-muted">
          <h3>未決事項</h3>
          <TextList items={definition.openQuestions} />
        </section>
        <section className="result-section">
          <h3>1〜2週間の実装タスク</h3>
          {definition.implementationTasks.length === 0 ? (
            <p className="empty-value">{EMPTY_TEXT}</p>
          ) : (
            <div className="result-cards">
              {[...definition.implementationTasks]
                .sort((left, right) => left.order - right.order)
                .map((task, index) => (
                  <article className="result-card" key={`${task.order}-${index}`}>
                    <h4>{task.order}. {task.title}</h4>
                    <p>{task.description}</p>
                    <h5>完了条件</h5>
                    <TextList items={task.completionCriteria} />
                  </article>
                ))}
            </div>
          )}
        </section>
        <section className="result-section">
          <h3>完了条件</h3>
          <TextList items={definition.completionCriteria} />
        </section>
      </div>
    </section>
  );
}
