import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from '@/lib/ai/feedback';
import type { FeedbackRequest, FeedbackResponse } from '@/lib/ai/feedback';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const fallback: FeedbackResponse = {
      stars: 2,
      conceptExplanation: 'APIキーが設定されていないため、自動評価をスキップしました。',
      message: 'よく出来ています。設計の意図は正しい方向です。',
      improvements: ['ANTHROPIC_API_KEY を設定するとAIレビューが使えます'],
      encouragement: '次のステージへ進みましょう！',
    };
    return NextResponse.json(fallback);
  }

  try {
    const body = (await req.json()) as FeedbackRequest;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(body) }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const data = JSON.parse(text) as FeedbackResponse;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
