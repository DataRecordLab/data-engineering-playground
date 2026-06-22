export interface FeedbackRequest {
  questId: string;
  stageId: string;
  conceptTaught: string;
  userSQL: string;
  validationPassed: boolean;
}

export interface FeedbackResponse {
  stars: 1 | 2 | 3;
  conceptExplanation: string;
  message: string;
  improvements: string[];
  encouragement: string;
}

export function buildPrompt(req: FeedbackRequest): string {
  return `あなたはDataCraft Agencyのシニアデータエンジニア「田中」です。
新人エンジニアのデータパイプライン設計をレビューしてください。

このステージで学ぶ概念: ${req.conceptTaught}

ユーザーが書いたSQL:
\`\`\`sql
${req.userSQL}
\`\`\`

バリデーション: ${req.validationPassed ? '全項目パス' : '一部失敗'}

以下のJSON形式のみで返してください（マークダウン不要）:
{
  "stars": 1か2か3,
  "conceptExplanation": "この設計のなぜを2〜3文で説明（DE概念の観点から）",
  "message": "全体フィードバック（2〜3文）",
  "improvements": ["改善提案1", "改善提案2"],
  "encouragement": "次のステージへの一言"
}

★評価基準:
★1: 動く（要件を最低限満たしている）
★2: 設計の意図が正しい（命名・型・構造が適切）
★3: ベストプラクティス（監査カラム・NULL処理・パフォーマンスまで考慮）

重要: コードの正誤ではなく、データエンジニアリングの設計思想を評価してください。`;
}
