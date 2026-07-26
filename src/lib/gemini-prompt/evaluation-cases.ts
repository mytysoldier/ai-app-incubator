import type { MvpDefinitionPromptInput } from "./index";

export const representativePromptCases: ReadonlyArray<
  MvpDefinitionPromptInput & { id: string; purpose: string }
> = [
  {
    id: "habit-tracker",
    purpose: "日常的な個人向けアプリ",
    idea: "毎朝の運動習慣を続けたい人向けに、1分で記録できる習慣トラッカーを作りたい。",
  },
  {
    id: "recipe-budget",
    purpose: "予算制約のある生活支援",
    idea: "冷蔵庫にある食材と予算を入れると、平日5日分の夕食案を提案するアプリ。",
    constraints: "ログインなし。食材データベースは最初から作らない。",
  },
  {
    id: "freelance-invoice",
    purpose: "業務効率化",
    idea: "フリーランスが請求内容を入力して、見積もりの抜け漏れを確認できるWebアプリ。",
  },
  {
    id: "study-timer",
    purpose: "シンプルな学習支援",
    idea: "資格試験の勉強時間を25分単位で記録し、今日やることを1つ表示するタイマー。",
    constraints: "スマホで片手操作できること。",
  },
  {
    id: "event-checklist",
    purpose: "小規模イベント準備",
    idea: "地域の読書会を初めて開く人が、会場、参加者、持ち物を漏れなく準備できるチェックリスト。",
  },
  {
    id: "pet-medication",
    purpose: "通知を含む生活支援",
    idea: "犬の投薬を家族で忘れないため、今日の投薬状況だけを共有できるアプリ。",
    constraints: "医療判断はしない。まずは家族2人で使う想定。",
  },
  {
    id: "portfolio-review",
    purpose: "クリエイター向け支援",
    idea: "デザイナーがポートフォリオのURLと応募先職種を入力すると、改善観点を整理するツール。",
  },
  {
    id: "local-walk",
    purpose: "外部データを使いそうなアイデア",
    idea: "観光客向けに、駅から30分で歩ける散歩コースを提案するアプリ。",
    constraints: "地図APIの有料利用は避けたい。",
  },
  {
    id: "meeting-note",
    purpose: "AI利用が想定されるアイデア",
    idea: "会議メモを貼ると、担当者別の次のアクションを箇条書きにするアプリ。",
    constraints: "入力内容は保存しない。",
  },
  {
    id: "garage-sale",
    purpose: "曖昧なアイデアへの仮定・未決事項",
    idea: "近所の人同士で不要品を譲り合えるサービスを作りたい。",
  },
];
