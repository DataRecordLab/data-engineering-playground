import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface FeedbackRequest {
  eventTitle: string;
  scenario: string;
  selectedKey: string;
  selectedLabel: string;
  selectedDescription: string;
  stageContext: string;
}

interface FeedbackResponse {
  message: string;
}

const FALLBACK_MESSAGES: Record<string, string> = {
  A: 'その選択は即効性がある反面、後から影響が出る場面もある。実務ではトレードオフを把握した上で判断できることが大事だよ。',
  B: 'バランスを取った判断だね。複雑さと安全性の間で折り合いをつける感覚は、実務で非常に重要なスキルだよ。',
  C: '長期視点での判断だ。コストはかかるけど、スケーラビリティや保守性を考えると正解になる場面が多い。なぜそう考えたか説明できることが大事だよ。',
};

function buildPrompt(body: FeedbackRequest): string {
  return `あなたは「田中シニアエンジニア」です。データエンジニアリング歴10年以上のプロフェッショナル。
口調: 親しみやすく本質を突く。「〜だよ」「〜だね」「〜かな」調。絵文字は使わない。

以下の緊急イベントで、プレイヤーが選択をしました。

【イベント】${body.eventTitle}
【状況】${body.scenario}
【プレイヤーの選択】${body.selectedKey}: ${body.selectedLabel}
【その選択の説明】${body.selectedDescription}
【ステージ】${body.stageContext}

この選択に対して、3〜4文でフィードバックしてください：
- その選択が合理的な理由（否定から入らない）
- 受け入れることになる主なトレードオフ・リスク
- 実務でその選択が特に有効な状況、または逆に注意すべき状況

必ず以下のJSON形式のみで返答してください（コードブロック不要）:
{"message": "フィードバック文"}`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as FeedbackRequest;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback: FeedbackResponse = {
      message: FALLBACK_MESSAGES[body.selectedKey] ?? FALLBACK_MESSAGES.B,
    };
    return NextResponse.json(fallback);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(buildPrompt(body));
    const text = result.response.text().trim();

    const cleaned = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const data = JSON.parse(cleaned) as FeedbackResponse;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      message: FALLBACK_MESSAGES[body.selectedKey] ?? FALLBACK_MESSAGES.B,
    });
  }
}
