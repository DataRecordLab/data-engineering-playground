'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MioBadge } from '@/components/characters/MioBadge';

// ── 型定義 ───────────────────────────────────────────────────────────

type MioExpression = 'excited' | 'happy' | 'thinking' | 'cute';

interface StepOption {
  icon: string;
  label: string;
  value: string;
}

interface Step {
  id: string;
  mioMessage: string;
  expression: MioExpression;
  question: string;
  options: StepOption[];
  cols: 1 | 2;
}

// ── ステップ定義 ─────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 'goal',
    mioMessage: 'はじめまして！私はMio！\n何を学びたいか教えて？',
    expression: 'excited',
    question: '学習の目標は？',
    cols: 2,
    options: [
      { icon: '🗺️', label: 'データパイプラインを設計したい', value: 'pipeline' },
      { icon: '⭐', label: 'データモデリングを学びたい',     value: 'modeling' },
      { icon: '🔍', label: 'データ品質を向上させたい',       value: 'quality'  },
      { icon: '💼', label: 'データエンジニアに転職したい',   value: 'career'   },
    ],
  },
  {
    id: 'experience',
    mioMessage: 'なるほど！\n今の経験レベルは？',
    expression: 'thinking',
    question: 'データエンジニアリングの経験は？',
    cols: 2,
    options: [
      { icon: '🌱', label: '完全初心者',                   value: 'beginner' },
      { icon: '📊', label: 'データ分析はやったことある',   value: 'analyst'  },
      { icon: '🔧', label: 'SQLは使える',                  value: 'sql'      },
      { icon: '💻', label: 'プログラマーだがDEは未経験',   value: 'dev'      },
    ],
  },
  {
    id: 'time',
    mioMessage: '1日どのくらい\n学習できそう？',
    expression: 'cute',
    question: '1日の学習時間は？',
    cols: 1,
    options: [
      { icon: '⚡', label: '5〜10分（まず試したい）',   value: 'short'  },
      { icon: '📖', label: '15〜30分（毎日コツコツ）', value: 'medium' },
      { icon: '🚀', label: '1時間以上（本気モード）',  value: 'long'   },
    ],
  },
  {
    id: 'source',
    mioMessage: 'Modelionを\nどこで知ったの？',
    expression: 'happy',
    question: 'どこで知りましたか？',
    cols: 2,
    options: [
      { icon: '🐦', label: 'Twitter / X',         value: 'twitter' },
      { icon: '📝', label: 'Qiita / Zenn / ブログ', value: 'qiita'  },
      { icon: '👥', label: '友人・知人から',        value: 'friend' },
      { icon: '🔍', label: '検索エンジン',          value: 'search' },
    ],
  },
];

// ── おすすめクエスト ──────────────────────────────────────────────────

interface Recommendation {
  questId: string;
  stageId: string;
  title: string;
  desc: string;
  accent: string;
  emoji: string;
}

const RECOMMENDATIONS: Record<string, Recommendation> = {
  pipeline: { questId: 'ec-site', stageId: 'pipeline', title: 'ECサイト — パイプライン設計',   desc: 'データの流れをノードで設計する。思考が整理される体験。', accent: '#818CF8', emoji: '⚙️' },
  modeling: { questId: 'ec-site', stageId: 'warehouse', title: 'ECサイト — Warehouseステージ', desc: 'スタースキーマを実際に設計するステージ。',                accent: '#F87171', emoji: '⭐' },
  quality:  { questId: 'ec-site', stageId: 'staging',   title: 'ECサイト — Stagingステージ',   desc: 'データクレンジング・型変換を体験するステージ。',          accent: '#34D399', emoji: '🔍' },
  career:   { questId: 'ec-site', stageId: 'source',    title: 'ECサイト — Sourceステージ',    desc: 'データエンジニアの仕事を最初から体験しよう！',            accent: '#A78BFA', emoji: '💼' },
};

// ── 星 ───────────────────────────────────────────────────────────────

const STARS = [
  [8,6],[23,12],[45,4],[67,18],[89,8],[12,28],[34,35],
  [56,22],[78,31],[93,42],[5,55],[27,62],[48,58],[70,70],
];

// ── ウェルカム画面 ────────────────────────────────────────────────────

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className={`min-h-screen bg-[#060918] text-white flex flex-col items-center justify-center px-6 gap-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-indigo-400 text-2xl font-black" style={{ textShadow: '0 0 16px rgba(129,140,248,0.8)' }}>◈</span>
          <span className="font-black text-xl tracking-tight">Modelion</span>
        </div>
        <h1 className="text-3xl font-black mb-3 leading-tight">
          ようこそ！<br />
          <span style={{ color: '#818CF8' }}>Modelion Agency</span> へ
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          まずあなたのことを少し教えてください。<br />
          ぴったりの学習プランを一緒に見つけよう！
        </p>
      </div>

      <MioBadge
        expression="excited"
        message="はじめまして！いくつか質問してもいいかな？📝"
        scale={7}
      />

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={onStart}
          className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-base transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30"
        >
          はじめる →
        </button>
        <Link href="/login" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
          すでにアカウントをお持ちの方
        </Link>
      </div>
    </div>
  );
}

// ── 結果画面 ─────────────────────────────────────────────────────────

function ResultScreen({ rec, answers }: { rec: Recommendation; answers: Record<string, string> }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const timeLabel: Record<string, string> = {
    short: '5〜10分/日', medium: '15〜30分/日', long: '1時間以上/日',
  };

  return (
    <div className={`min-h-screen bg-[#060918] text-white flex flex-col items-center justify-center px-6 py-12 gap-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <MioBadge
        expression="excited"
        message="分析完了！あなたにぴったりのクエストが見つかったよ！🎯"
        scale={6}
      />

      <div className="w-full max-w-sm">
        <p className="text-center text-[10px] text-slate-500 mb-4 uppercase tracking-widest font-mono">おすすめクエスト</p>

        {/* 推奨カード */}
        <div
          className="rounded-2xl border p-6 mb-6"
          style={{ borderColor: `${rec.accent}40`, background: `${rec.accent}08` }}
        >
          <div className="flex items-start gap-4 mb-4">
            <span className="text-4xl flex-shrink-0">{rec.emoji}</span>
            <div>
              <p className="font-black text-white text-base leading-snug">{rec.title}</p>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">{rec.desc}</p>
            </div>
          </div>
          {/* ステージバー */}
          <div className="flex gap-1">
            {['source','staging','warehouse','mart','pipeline'].map((s) => (
              <div key={s} className="flex-1 h-1 rounded-full"
                style={{ background: s === rec.stageId ? rec.accent : `${rec.accent}20` }} />
            ))}
          </div>
        </div>

        {/* 選択内容サマリー */}
        {answers.time && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 mb-5 text-xs text-slate-500">
            <span>⏱</span>
            <span>目標学習時間: <span className="text-slate-300 font-medium">{timeLabel[answers.time] ?? ''}</span></span>
          </div>
        )}

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href={`/quest/${rec.questId}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black text-sm transition-all hover:scale-105 hover:shadow-xl text-slate-950"
            style={{ background: rec.accent, boxShadow: `0 4px 24px ${rec.accent}40` }}
          >
            ▶ クエストを始める（アカウント不要）
          </Link>
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-sm border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-colors"
          >
            アカウントを作って進捗を保存する
          </Link>
        </div>

        <p className="text-center text-slate-700 text-[10px] mt-4">
          アカウント不要で今すぐ体験できます
        </p>
      </div>
    </div>
  );
}

// ── メインウィザード ──────────────────────────────────────────────────

export default function StartPage() {
  const [screen, setScreen] = useState<'welcome' | 'quiz' | 'result'>('welcome');
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);

  function handleSelect(value: string) {
    if (animating) return;
    setSelected(value);
    setAnimating(true);

    setTimeout(() => {
      const step = STEPS[stepIdx];
      const newAnswers = { ...answers, [step.id]: value };
      setAnswers(newAnswers);

      setFadeIn(false);
      setTimeout(() => {
        setSelected(null);
        setAnimating(false);
        if (stepIdx < STEPS.length - 1) {
          setStepIdx(i => i + 1);
        } else {
          setScreen('result');
        }
        setFadeIn(true);
      }, 200);
    }, 500);
  }

  function handleBack() {
    if (stepIdx === 0) { setScreen('welcome'); return; }
    setFadeIn(false);
    setTimeout(() => { setStepIdx(i => i - 1); setFadeIn(true); }, 200);
  }

  if (screen === 'welcome') return <WelcomeScreen onStart={() => setScreen('quiz')} />;

  const rec = RECOMMENDATIONS[answers.goal ?? 'pipeline'] ?? RECOMMENDATIONS.pipeline;
  if (screen === 'result') return <ResultScreen rec={rec} answers={answers} />;

  const step = STEPS[stepIdx];
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#060918] text-white flex flex-col relative overflow-hidden">

      {/* 星 */}
      <div className="fixed inset-0 pointer-events-none">
        {STARS.map(([x, y], i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ left: `${x}%`, top: `${y}%`, width: 1, height: 1, opacity: 0.15 + (i % 4) * 0.06 }} />
        ))}
      </div>

      {/* プログレスバー */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-900 z-20">
        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* ナビ */}
      <div className="fixed top-3 left-4 right-4 flex items-center justify-between z-20">
        <button onClick={handleBack} className="text-slate-600 hover:text-slate-300 text-sm transition-colors px-2 py-1">
          ← 戻る
        </button>
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{ width: i === stepIdx ? 20 : 6, height: 6, background: i < stepIdx ? '#818CF8' : i === stepIdx ? '#818CF8' : '#1e293b' }} />
          ))}
        </div>
        <Link href="/signup" className="text-slate-700 hover:text-slate-500 text-xs transition-colors px-2 py-1">
          スキップ
        </Link>
      </div>

      {/* コンテンツ */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-20 gap-8 transition-opacity duration-200"
        style={{ opacity: fadeIn ? 1 : 0 }}
      >
        {/* Mio */}
        <MioBadge
          key={stepIdx}
          expression={step.expression}
          message={step.mioMessage}
          scale={6}
        />

        {/* 質問 */}
        <div className="text-center">
          <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase mb-2">
            STEP {stepIdx + 1} / {STEPS.length}
          </p>
          <h2 className="text-2xl font-black text-white">{step.question}</h2>
        </div>

        {/* 選択肢 */}
        <div
          className={`w-full max-w-sm grid gap-3 ${step.cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {step.options.map(opt => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                disabled={animating}
                className={`
                  flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-left font-semibold text-sm
                  transition-all duration-200 select-none
                  ${step.cols === 2 ? 'flex-col items-center text-center gap-2' : ''}
                  ${isSelected
                    ? 'border-indigo-500 bg-indigo-500/20 scale-95 text-white'
                    : 'border-slate-800 bg-slate-900/60 hover:border-indigo-500/40 hover:bg-slate-800/60 text-slate-300 hover:text-white active:scale-95'
                  }
                `}
              >
                <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                <span className={`leading-snug ${step.cols === 2 ? 'text-xs' : 'text-sm flex-1'}`}>{opt.label}</span>
                {isSelected && step.cols === 1 && <span className="ml-auto text-indigo-400 text-lg">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
