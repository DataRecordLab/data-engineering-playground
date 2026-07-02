export type EventStageContext = 'source' | 'staging' | 'warehouse' | 'mart' | 'pipeline' | 'any';

export interface EventOption {
  key: 'A' | 'B' | 'C';
  label: string;
  description: string;
}

export interface EmergencyEvent {
  id: string;
  title: string;
  icon: string;
  scenario: string;
  question: string;
  options: [EventOption, EventOption, EventOption];
  stageContext: EventStageContext;
  xpReward: number;
}

export const EMERGENCY_EVENTS: EmergencyEvent[] = [
  // ── Source Layer ────────────────────────────────────────────────────────────
  {
    id: 'source_schema_change',
    title: '上流APIスキーマ変更通知',
    icon: '📡',
    scenario:
      '上流サービスチームから通知が届きました。\n来週から `order_id` が `transaction_id` にリネームされ、新カラム `discount_rate` が追加されます。\nSource Layerへの対応を今すぐ決めてください。',
    question: 'あなたならどう対処する？',
    options: [
      {
        key: 'A',
        label: '既存テーブルを直接変更する',
        description: 'シンプルに即対応。でも後続の全クエリへの影響は？',
      },
      {
        key: 'B',
        label: '移行期間中は新旧カラム両方を保持する',
        description: 'テーブルは複雑になるが、後続は段階的に移行できる',
      },
      {
        key: 'C',
        label: 'バージョン別に新テーブル src_v2_orders を作る',
        description: '管理コストは増えるが、履歴と切り戻しが明確になる',
      },
    ],
    stageContext: 'source',
    xpReward: 40,
  },
  {
    id: 'source_volume_spike',
    title: 'データ量が突然5倍に',
    icon: '📈',
    scenario:
      'バッチ実行中にアラートが発火。\n通常1日10万件のオーダーデータが、今日だけで50万件流れ込んでいます。\nキャンペーンの影響らしいですが、Source Layerのロード処理が追いつきそうにありません。',
    question: 'どう対応する？',
    options: [
      {
        key: 'A',
        label: 'ロードをそのまま続け、完了を待つ',
        description: 'データの完全性は保てるが、下流の処理が大幅に遅延する',
      },
      {
        key: 'B',
        label: '今日分のデータを時間帯で分割してロードする',
        description: '並列化で速くなるが、分割ロジックの実装コストがかかる',
      },
      {
        key: 'C',
        label: '一旦ロードを止め、明日の通常バッチで処理する',
        description: '今日のデータ反映が遅れるが、システムへの負荷を抑えられる',
      },
    ],
    stageContext: 'source',
    xpReward: 35,
  },

  // ── Staging Layer ───────────────────────────────────────────────────────────
  {
    id: 'staging_null_spike',
    title: '⚠ データ品質アラート',
    icon: '🚨',
    scenario:
      '本日のバッチ実行後、`stg_customers` の `email` カラムの34%がNULLになっています。\n上流CRMの更新タイミングとのズレが原因らしいですが、このままMart Layerに流すと分析が壊れます。\nStaging Layerの設計としてどう対応しますか？',
    question: 'NULL値をどう扱う？',
    options: [
      {
        key: 'A',
        label: 'NULLレコードをフィルタリングして除外する',
        description: 'クリーンなデータだけ下流に流せるが、件数が合わなくなる',
      },
      {
        key: 'B',
        label: 'NULLを "unknown" などのデフォルト値で埋める',
        description: 'パイプラインは動くが、NULLの意味（本当に不明？）が失われる',
      },
      {
        key: 'C',
        label: 'NULLのまま保持し `is_email_valid` フラグカラムを追加',
        description: '原因追跡ができるが、下流での対処ロジックが必要になる',
      },
    ],
    stageContext: 'staging',
    xpReward: 45,
  },
  {
    id: 'staging_dedup',
    title: 'チームメンバーの設計レビュー依頼',
    icon: '👀',
    scenario:
      '新メンバーのSさんからレビュー依頼が届きました。\nStaging Layerで重複排除を実装しようとしているのですが、`ORDER BY created_at DESC LIMIT 1` を使った方法で書いています。\nあなたならどうアドバイスしますか？',
    question: 'どうアドバイスする？',
    options: [
      {
        key: 'A',
        label: 'ROW_NUMBER() ウィンドウ関数での重複排除を提案する',
        description: '大規模データでも安定するが、Sさんに説明コストがかかる',
      },
      {
        key: 'B',
        label: '今の方法でも動くので、このままでいいと伝える',
        description: 'シンプルだが、データ量が増えると意図しない動作のリスクがある',
      },
      {
        key: 'C',
        label: 'そもそも重複の発生源（Source Layer）を直すべきと提案',
        description: '根本解決だが影響範囲が広く、今すぐは難しい場合が多い',
      },
    ],
    stageContext: 'staging',
    xpReward: 35,
  },

  // ── Warehouse Layer ─────────────────────────────────────────────────────────
  {
    id: 'warehouse_new_requirement',
    title: 'クライアントから追加要件',
    icon: '💬',
    scenario:
      '田中CTOからSlackが届きました。\n「月次レポートに地域別の売上も追加してほしい。でも今のweekly_salesテーブルは変えたくない💦 よろしく！」\nWarehouse Layerの設計をどう変えますか？',
    question: '地域別売上をどう追加する？',
    options: [
      {
        key: 'A',
        label: 'fact_orders に region_id カラムを追加する',
        description: 'シンプルだが、既存レポートへの影響確認が必要になる',
      },
      {
        key: 'B',
        label: 'fact_orders_by_region という新Factテーブルを作る',
        description: '既存への影響ゼロだが、テーブルが増えて管理コストが上がる',
      },
      {
        key: 'C',
        label: 'dim_region を追加してJOINする正規化設計にする',
        description: 'スケーラブルで美しいが、設計変更・クエリ変更のコストが高い',
      },
    ],
    stageContext: 'warehouse',
    xpReward: 45,
  },

  // ── Mart Layer ──────────────────────────────────────────────────────────────
  {
    id: 'mart_executive_rush',
    title: '経営会議まで2時間',
    icon: '⏰',
    scenario:
      '役員室から緊急連絡です。\n「今日の経営会議でDAUとLTV（顧客生涯価値）を比較したい。でもLTVはまだMartにない。なんとかなる？」\n現在、LTVの計算ロジックは未実装です。どうしますか？',
    question: 'どう対処する？',
    options: [
      {
        key: 'A',
        label: 'LTV計算ロジックを今すぐMartに追加して出す（会議に遅れる）',
        description: '正しい設計だが、2時間で完成するかどうかが問題',
      },
      {
        key: 'B',
        label: 'Warehouseでアドホッククエリを書いて今日だけ対応',
        description: '速く対応できるが、再利用できない。技術的負債になる',
      },
      {
        key: 'C',
        label: '今ある指標で臨み、LTVは来週Martに追加すると約束する',
        description: 'ビジネス的に現実的だが、約束の管理と信頼維持が必要',
      },
    ],
    stageContext: 'mart',
    xpReward: 50,
  },

  // ── Any Stage ───────────────────────────────────────────────────────────────
  {
    id: 'any_legacy_discovery',
    title: 'レガシーシステムを発見',
    icon: '🗂️',
    scenario:
      '業務フローのヒアリング中に衝撃の事実が判明しました。\n毎朝、担当者が手動でExcelマクロを実行して集計し、Slackに貼り付けています。\nあなたが設計中のパイプラインと二重管理状態です。どう進めますか？',
    question: 'どうやって移行する？',
    options: [
      {
        key: 'A',
        label: '新パイプラインと並行稼働させ、数値一致後に切り替える',
        description: '安全な移行だが、移行期間中はコストが2倍かかる',
      },
      {
        key: 'B',
        label: '即座にExcel作業を廃止して新パイプラインに完全移行',
        description: 'スピードは最速だが、バグ発見時の影響が大きくなる',
      },
      {
        key: 'C',
        label: 'ExcelのデータもSource Layerに取り込んで統合する',
        description: '全データを活かせるが、設計の複雑性が増す',
      },
    ],
    stageContext: 'any',
    xpReward: 40,
  },
  {
    id: 'any_governance',
    title: 'データガバナンスポリシー変更',
    icon: '🏛️',
    scenario:
      '法務チームから通知が届きました。\n「個人情報保護の観点から、顧客のメールアドレス・電話番号は本番パイプラインでマスキング処理が必要です。3週間後に施行。」\n現在、個人情報はSource Layerに生データで保存されています。どう対応しますか？',
    question: 'どのレイヤーでマスキングする？',
    options: [
      {
        key: 'A',
        label: 'Source Layerでの取り込み時点でマスキングする',
        description: '早期に保護できるが、生データを永久に失う。デバッグが困難になる',
      },
      {
        key: 'B',
        label: 'Staging Layerでのクレンジング時にマスキングする',
        description: 'Source は生データを保持できるが、アクセス制御の設計が必要',
      },
      {
        key: 'C',
        label: 'Mart Layerの分析用テーブルでのみマスキングする',
        description: '分析者への影響を最小化できるが、中間層にリスクが残る',
      },
    ],
    stageContext: 'any',
    xpReward: 45,
  },
];

export function getEventsForStage(stageId: string): EmergencyEvent[] {
  return EMERGENCY_EVENTS.filter(
    e => e.stageContext === stageId || e.stageContext === 'any'
  );
}
