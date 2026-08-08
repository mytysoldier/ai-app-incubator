# 本番リリースと運用手順

公開・保護・費用管理を、安全に再現するための手順です。APIキー、入力本文、生成結果はこのリポジトリへ記録しません。料金上限は運用方針が変わったときに、この文書とダッシュボードを同時に更新します。

## 事前確認

公開前にローカルで次をすべて実行します。

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`GEMINI_API_KEY` は Gemini 専用の Google Cloud プロジェクトで発行します。キーを `.env.local`、シェル履歴、GitHub Issue、PR、Vercel の公開ログへ貼り付けません。

## Vercel への公開

1. Vercel Dashboard で GitHub リポジトリ `mytysoldier/ai-app-incubator` を新規プロジェクトとして Import する。
2. Framework Preset は Next.js、Production Branch は `main` を確認する。Preview は Pull Request ごとのデプロイを有効にする。
3. **Settings → Environment Variables** で `GEMINI_API_KEY` を Production と Preview に追加する。
   - `NEXT_PUBLIC_` 接頭辞は付けない。
   - 値はサーバー環境変数としてのみ登録し、画面共有・スクリーンショット・ログに残さない。
4. `main` へのマージでProductionへ自動デプロイされることを確認し、Deploymentsが`Ready`になったらProduction URLを開く。Preview URLでも環境変数を利用するため、信頼できないPRからのデプロイには注意する。

## Bot Protection

Vercel Dashboard の対象プロジェクトで **Firewall → Rules → Bot Management** を開き、Bot Protection Managed Ruleset を **Challenge Mode** にして Publish します。

- Challenge Mode は非ブラウザの自動アクセスをチャレンジし、通常のブラウザ利用を妨げにくい設定です。
- 外部のリバースプロキシを Vercel の前段に置くと Bot Protection が正しく機能しません。MVPでは使用しません。
- 有効化後は Firewall の Traffic で、通常のブラウザからトップページと生成APIを利用できること、異常な自動アクセスがチャレンジされていることを確認します。

## Gemini の費用・利用量設定

1. Google AI StudioでGemini専用プロジェクトを選び、**Spend → Monthly spend cap** を初期運用額の **300円** に設定する。
2. Google Cloud Consoleの対象Billing Accountで、対象プロジェクトだけをスコープにした月次Budgetを **300円** で作成する。
3. Actual spend のメール通知しきい値を **50%、80%、100%** に設定し、受信者を確認する。
4. AI Studio の Usage / Rate limits で、そのプロジェクトと利用モデルの RPM、TPM、RPD を確認する。必要になるまで上限引き上げは申請しない。

プロジェクトの Spend Cap は反映に最大およそ10分かかる場合があり、超過を完全には防げません。Budget の通知は監視であり、単独では利用停止を保証しません。両方を設定します。

## 公開後の確認

Production URLで、次を確認します。Previewは環境変数を設定した信頼できるPRだけで確認します。

- 正常な入力で1件生成できる。
- 空入力、20文字未満、上限超過、400、429、タイムアウト、上流障害が画面で案内され、クラッシュしないことを自動テストで確認する。
- ブラウザの開発者ツールと公開済みJavaScriptに `GEMINI_API_KEY` が存在しない。
- Vercel Runtime Logs に入力本文・生成結果・APIキーが出力されていない。
- 320px幅とキーボード操作で、入力・生成・コピーができる。
- Bot Protection が Challenge Mode で、Geminiの月次上限と通知しきい値が設定済みである。

公開直後は少なくとも毎日、Vercel の Firewall/Usage と Gemini の Usage を確認します。費用や異常トラフィックが想定を超えた場合は、まず Gemini APIキーをGoogle AI Studioで無効化または削除して生成を止めます。Vercelの `GEMINI_API_KEY` を削除する場合は、続けてProductionを再デプロイし、`/api/generate` が設定不足のエラーを返すことを確認します。環境変数の削除だけでは、すでに稼働中のデプロイにあるキーは無効になりません。停止後に原因を確認します。

## 参照

- [Vercel Bot Management](https://vercel.com/docs/bot-management)
- [Gemini API Billing](https://ai.google.dev/gemini-api/docs/billing)
- [Google Cloud Budget alerts](https://cloud.google.com/billing/docs/how-to/budgets)
