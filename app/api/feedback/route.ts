import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { buildPrompt } from '@/lib/ai/feedback';
import type { FeedbackRequest, FeedbackResponse } from '@/lib/ai/feedback';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const fallback: FeedbackResponse = {
      stars: 2,
      conceptExplanation: 'AIキーが設定されていないため、自動評価をスキップしました。',
      message: 'よく出来ています。設計の意図は正しい方向です。',
      improvements: ['GEMINI_API_KEY を設定するとAIレビューが使えます'],
      encouragement: '次のステージへ進みましょう！',
    };
    return NextResponse.json(fallback);
  }

  try {
    const body = (await req.json()) as FeedbackRequest;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(buildPrompt(body));
    const text = result.response.text();

    // Gemini が ```json ... ``` で返す場合に備えてクリーニング
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    const data = JSON.parse(cleaned) as FeedbackResponse;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
