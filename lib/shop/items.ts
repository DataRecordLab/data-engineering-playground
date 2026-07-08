export type ShopCategory = 'powerup' | 'cosmetic' | 'title';

export interface ShopItem {
  id:       string;
  category: ShopCategory;
  name:     string;
  desc:     string;
  icon:     string;
  price:    number;
  color:    string;
  /** outfit / mio-skin / title-badge etc. */
  effectType?: string;
  effectValue?: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Power-ups ──────────────────────────────────────────────────────
  {
    id: 'streak_freeze',
    category: 'powerup',
    name: 'ストリークフリーズ',
    desc: '1日ログインしなくてもストリークを守る。次にログインするまで有効。',
    icon: '🛡️',
    price: 200,
    color: '#1CB0F6',
  },
  {
    id: 'xp_boost',
    category: 'powerup',
    name: 'XP ブースト ×2',
    desc: '次にクリアするステージのXP獲得量が2倍になる。1回使い切り。',
    icon: '⚡',
    price: 500,
    color: '#FFC800',
  },
  {
    id: 'ai_feedback_x3',
    category: 'powerup',
    name: 'AIレビュー +3回',
    desc: '本日のAIフィードバック使用回数を3回追加する。',
    icon: '🤖',
    price: 300,
    color: '#818CF8',
  },
  {
    id: 'hint_unlock',
    category: 'powerup',
    name: 'ヒントアンロック',
    desc: 'スキルセクションの問題でヒントを表示できるようにする。',
    icon: '💡',
    price: 150,
    color: '#34D399',
  },

  // ── Cosmetics ──────────────────────────────────────────────────────
  {
    id: 'outfit_hacker',
    category: 'cosmetic',
    name: 'ハッカースーツ',
    desc: 'プレイヤーキャラの衣装。ダークインディゴのステルス仕様。',
    icon: '🥷',
    price: 800,
    color: '#4338CA',
    effectType: 'outfit',
    effectValue: 'jacket',
  },
  {
    id: 'outfit_matrix',
    category: 'cosmetic',
    name: 'マトリックスグリーン',
    desc: 'プレイヤーキャラの衣装。端末の前のデータエンジニア仕様。',
    icon: '💚',
    price: 1200,
    color: '#58CC02',
    effectType: 'outfit',
    effectValue: 'tee',
  },
  {
    id: 'mio_gold',
    category: 'cosmetic',
    name: 'Lio ゴールドスキン',
    desc: 'ガイドLioのカラーがゴールド＆プラチナに変化する。',
    icon: '✨',
    price: 2000,
    color: '#FCD34D',
    effectType: 'mio-skin',
    effectValue: 'gold',
  },
  {
    id: 'glasses_cyber',
    category: 'cosmetic',
    name: 'サイバーグラス',
    desc: 'プレイヤーキャラにシアン色のサイバーグラスを装備。',
    icon: '🕶️',
    price: 600,
    color: '#1CB0F6',
    effectType: 'accessory',
    effectValue: 'glasses_cyber',
  },

  // ── Titles ────────────────────────────────────────────────────────
  {
    id: 'title_pipeline',
    category: 'title',
    name: 'パイプライン職人',
    desc: 'プロフィールに表示されるタイトルバッジ。パイプライン設計のプロの証。',
    icon: '🔧',
    price: 1000,
    color: '#818CF8',
    effectType: 'title',
    effectValue: 'パイプライン職人',
  },
  {
    id: 'title_wizard',
    category: 'title',
    name: 'データウィザード',
    desc: 'プロフィールに表示される称号。データの魔法使いを名乗れる。',
    icon: '🧙',
    price: 1500,
    color: '#A78BFA',
    effectType: 'title',
    effectValue: 'データウィザード',
  },
  {
    id: 'title_architect',
    category: 'title',
    name: 'データアーキテクト',
    desc: '高レベルプレイヤー専用の最高位称号。全クエスト完了への証。',
    icon: '🏛️',
    price: 3000,
    color: '#FCD34D',
    effectType: 'title',
    effectValue: 'データアーキテクト',
  },
];

export const SHOP_CATEGORIES: { id: ShopCategory; label: string; icon: string }[] = [
  { id: 'powerup',  label: 'パワーアップ', icon: '⚡' },
  { id: 'cosmetic', label: 'コスメ',        icon: '✨' },
  { id: 'title',    label: '称号',          icon: '🏆' },
];
