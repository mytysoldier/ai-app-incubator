# Gemini生成プロンプト評価（Issue #5）

## 確定した設定

- モデル: `gemini-3.1-flash-lite`
- Thinking level: `minimal`
- 入力トークン目標: 最大 6,000
- 出力トークン上限: 3,000（thinkingを含む）
- Structured Output: `src/lib/mvp-definition/schema.ts` の `mvpDefinitionSchema`

System Instructionとユーザープロンプトの組み立ては `src/lib/gemini-prompt/index.ts` で管理する。日本語固定、重複回避、1〜2週間で公開できるMVPへの絞り込み、仮定・未決事項の分離をSystem Instructionで明示している。

## 品質評価

`src/lib/gemini-prompt/evaluation-cases.ts` に代表入力10件を記録している。自動評価では、各生成結果について次を確認する。

1. JSON Schemaに準拠していること
2. MVP機能とMVP対象外が分離されていること
3. 技術選定に理由があること
4. 実装タスクに連番の順序と完了条件があること
5. 仮定または未決事項が明示されていること

2026-07-25時点で、プロンプト設定、10件の入力、正常・異常な構造化結果に対する自動評価は `npm test` で成功している。Gemini APIキーはこのリポジトリに保存しないため、実モデルによる10件の最終評価は #7 のAPI実装後に、AI Studioまたは同APIの利用量情報を使って実施する。

### 実モデル評価の手順

1. AI Studioでモデルを `gemini-3.1-flash-lite`、Thinkingを `minimal` に設定する。
2. System Instructionへ `MVP_DEFINITION_SYSTEM_INSTRUCTION` を貼り、Structured Outputへ `mvpDefinitionSchema` を設定する。
3. `representativePromptCases` の10件を1件ずつ実行する。
4. 各JSONを `evaluateMvpDefinition` で評価し、失敗した基準と重複・過剰機能・曖昧な表現を記録する。
5. 不足があればSystem Instructionを優先して直し、同じ10件を再評価する。

10件分の出力JSONとAPIの利用量を `evaluateMvpDefinitionBatch` へ渡す。これにより、10件以上・ID重複なし・全件の品質ゲート合格・平均推定料金1円未満を一度に判定できる。トークン数が安全な0以上の整数でない場合は、料金を計算せず不合格にする。1円未満の判定は浮動小数点ではなく料金の整数比で比較するため、ちょうど1円は不合格になる。この関数は外部APIを呼ばず、出力と利用量を評価するだけである。

### GitHub Actionsでの手動回帰評価（Issue #20）

`.github/workflows/gemini-prompt-regression.yml` は `workflow_dispatch` だけで起動する。push・pull requestではGemini APIを呼ばない。

1. Gemini専用プロジェクトのAPIキーを、GitHub repository の **Settings → Secrets and variables → Actions** で `GEMINI_API_KEY` として登録する。
2. GitHub Actionsの **Gemini prompt regression evaluation** を開き、**Run workflow** で手動実行する。
3. 成功条件は、代表入力10件すべてのSchema・品質評価合格と、平均推定料金が1円未満であること。
4. 実行後、Artifact `gemini-prompt-evaluation-summary` で件数、ケースID、合否、失敗した品質基準、利用トークン数、推定料金だけを確認する。

`GEMINI_API_KEY` が未設定の場合は、値を出力せず設定不足として失敗する。入力本文、Geminiの生成本文、APIキーはログ、Job Summary、Artifactに記録しない。

## 料金評価

料金は `estimateGeminiGenerationCostYen` で算出する。2026-07-25に確認したGemini Developer APIのStandard料金は、入力 $0.25 / 100万トークン、出力（thinking込み） $1.50 / 100万トークンとしている。換算は保守的に 1 USD = 160円で固定した。料金は変更され得るため、実運用前に [Gemini API料金表](https://ai.google.dev/gemini-api/docs/pricing) を再確認する。

入力6,000トークン、出力（thinking込み）3,000トークンの場合の推定は **0.96円/生成** で、1円未満の目標を満たす。入力が上限へ近づく、またはthinking込み出力が上限を超える場合は目標を満たさない可能性があるため、実測利用量で平均値を確認する。

## 残る弱点

- 10件の実モデル出力の内容評価と実測トークン数は、APIキーを使える環境で未実施。
- 自動評価は構造と最低限の品質ゲートであり、文章の重複や実装妥当性の最終判断は人手で確認する。
- 為替とGemini API料金は変動するため、費用目標は実行時の料金・利用量で再検証する。
