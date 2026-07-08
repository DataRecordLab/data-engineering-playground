'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MioIllustration, type MioExpression } from '@/components/characters/MioIllustration';

// ── Audio ─────────────────────────────────────────────────────────────

interface WindowWithWebkit {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

function playSelectSound() {
  try {
    const w = window as unknown as WindowWithWebkit;
    const AudioCtx = w.AudioContext ?? w.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523, 659, 784]; // C5 E5 G5 — pleasant major chord arpeggio
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch { /* ignore – browser may block audio before user gesture */ }
}

// ── Types ─────────────────────────────────────────────────────────────

interface StepOption {
  icon: string;
  label: string;
  sublabel?: string;
  value: string;
  feedback: string;
}

interface Step {
  id: string;
  mioMessage: string;
  expression: MioExpression;
  question: string;
  options: StepOption[];
  cols: 1 | 2;
}

// ── Step definitions ──────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 'goal',
    mioMessage: 'はじめまして！私はLio！\n何を学びたいか教えて？',
    expression: 'excited',
    question: '学習の目標は？',
    cols: 2,
    options: [
      {
        icon: '🗺️', label: 'パイプラインを\n設計したい', value: 'pipeline',
        feedback: 'パイプライン設計、いい選択！\nデータの流れを作る体験は\n感動するよ！',
      },
      {
        icon: '⭐', label: 'データモデリングを\n学びたい', value: 'modeling',
        feedback: 'モデリングはデータの骨格！\n奥深くてめちゃくちゃ面白いよ！',
      },
      {
        icon: '🔍', label: 'データ品質を\n向上させたい', value: 'quality',
        feedback: 'データ品質、超大事！\nゴミデータからは良い分析は\n生まれないからね！',
      },
      {
        icon: '💼', label: 'データエンジニアに\n転職したい', value: 'career',
        feedback: 'キャリアチェンジ応援してるよ！\n一緒に最短でスキルを\n身につけよう！',
      },
    ],
  },
  {
    id: 'experience',
    mioMessage: 'いいね！\n今のスキルを教えて？',
    expression: 'thinking',
    question: 'データエンジニアリングの経験は？',
    cols: 2,
    options: [
      {
        icon: '🌱', label: '完全初心者', sublabel: 'プログラミング経験なし', value: 'beginner',
        feedback: '初心者大歓迎！\nゼロから楽しく学べる\nカリキュラムを用意してるよ！',
      },
      {
        icon: '📊', label: 'データ分析あり', sublabel: 'ExcelやBIツールは触った', value: 'analyst',
        feedback: 'データ分析経験があるんだ！\n基礎があるから理解が\nスムーズだよ！',
      },
      {
        icon: '🔧', label: 'SQLは書ける', sublabel: 'SELECT文なら問題なし', value: 'sql',
        feedback: 'SQLが書けるのは強い！\nすぐに実践的なことが\nできるよ！',
      },
      {
        icon: '💻', label: 'プログラマー', sublabel: 'コードは書けるがDEは初', value: 'dev',
        feedback: 'エンジニアリング力があるね！\nDEの概念さえ掴めば\n最強になれるよ！',
      },
    ],
  },
  {
    id: 'time',
    mioMessage: '1日どのくらい\n学習できそう？',
    expression: 'cute',
    question: '1日の学習時間は？',
    cols: 1,
    options: [
      {
        icon: '⚡', label: '5〜10分', sublabel: 'まず試したい・忙しくても続けたい', value: 'short',
        feedback: '毎日5分でも続けることが大事！\n習慣化が最強の学習法だよ！',
      },
      {
        icon: '📖', label: '15〜30分', sublabel: '毎日コツコツ・着実に進みたい', value: 'medium',
        feedback: '30分あれば毎日しっかり進める！\n理想的なペースだよ！',
      },
      {
        icon: '🚀', label: '1時間以上', sublabel: '本気モード・できるだけ早く習得', value: 'long',
        feedback: '本気モードかっこいい！\n一緒に爆速で成長しよう！🔥',
      },
    ],
  },
  {
    id: 'source',
    mioMessage: 'Modelionを\nどこで知ったの？',
    expression: 'happy',
    question: 'どこで知りましたか？',
    cols: 2,
    options: [
      {
        icon: '🐦', label: 'Twitter / X', value: 'twitter',
        feedback: 'SNSで見つけてくれてありがとう！\nシェアしてくれた人に\n感謝だね！',
      },
      {
        icon: '📝', label: 'Qiita / Zenn\n/ ブログ', value: 'qiita',
        feedback: '技術記事から来てくれたんだ！\n知識への好奇心、\n最高だよ！',
      },
      {
        icon: '👥', label: '友人・知人から', value: 'friend',
        feedback: '口コミで来てくれたんだ！\n紹介してくれた人に\n感謝だね！',
      },
      {
        icon: '🔍', label: '検索エンジン', value: 'search',
        feedback: '検索で見つけてくれたんだ！\nたどり着いてくれて\nよかった！',
      },
    ],
  },
];

// ── Recommendations ───────────────────────────────────────────────────

interface Recommendation {
  questId: string;
  title: string;
  desc: string;
  accent: string;
  emoji: string;
}

const RECOMMENDATIONS: Record<string, Recommendation> = {
  pipeline: {
    questId: 'ec-site', emoji: '⚙️', accent: '#818CF8',
    title: 'ECサイト — パイプライン設計クエスト',
    desc: 'データの流れをノードで設計する。思考が整理される体験。',
  },
  modeling: {
    questId: 'ec-site', emoji: '⭐', accent: '#F87171',
    title: 'ECサイト — Warehouse設計クエスト',
    desc: 'スタースキーマを実際に設計するステージ。',
  },
  quality: {
    questId: 'ec-site', emoji: '🔍', accent: '#34D399',
    title: 'ECサイト — データ品質クエスト',
    desc: 'データクレンジング・型変換を体験するステージ。',
  },
  career: {
    questId: 'ec-site', emoji: '💼', accent: '#A78BFA',
    title: 'ECサイト — はじめてのクエスト',
    desc: 'データエンジニアの仕事を最初から体験しよう！',
  },
};

// ── Speech bubble ─────────────────────────────────────────────────────

function SpeechBubble({ message }: { message: string }) {
  return (
    <div className="relative">
      {/* Left pointer */}
      <div
        className="absolute left-0 top-5 -translate-x-[7px] w-3 h-3 bg-white"
        style={{ clipPath: 'polygon(100% 0, 0 50%, 100% 100%)' }}
      />
      <div className="bg-white text-slate-800 rounded-2xl px-4 py-3 shadow-md text-sm font-semibold leading-relaxed whitespace-pre-line">
        {message}
      </div>
    </div>
  );
}

// ── Welcome screen ────────────────────────────────────────────────────

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`min-h-screen bg-\[#131525\] text-white flex flex-col items-center justify-center px-6 gap-10 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-indigo-400 text-2xl font-black" style={{ textShadow: '0 0 16px rgba(129,140,248,0.8)' }}>
          ◈
        </span>
        <span className="font-black text-xl tracking-tight">Modelion</span>
      </div>

      {/* Large Mio + bubble */}
      <div className="flex flex-col items-center gap-4">
        <div className="animate-idle-bob">
          <MioIllustration expression="excited" size={160} />
        </div>
        <div className="relative">
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 rounded-sm" />
          <div className="bg-white text-slate-800 rounded-2xl px-6 py-4 shadow-xl text-sm font-semibold text-center max-w-xs leading-relaxed">
            はじめまして！<br />
            私はLio、データエンジニアリングの<br />
            <span className="text-indigo-600 font-black">案内役</span>だよ！📊
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <DuoButton onClick={onStart} disabled={false}>
          はじめる
        </DuoButton>
        <Link href="/login" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
          すでにアカウントをお持ちの方
        </Link>
      </div>
    </div>
  );
}

// ── Result screen ─────────────────────────────────────────────────────

function ResultScreen({ rec, answers }: { rec: Recommendation; answers: Record<string, string> }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const timeLabel: Record<string, string> = {
    short: '5〜10分/日', medium: '15〜30分/日', long: '1時間以上/日',
  };

  return (
    <div
      className={`min-h-screen bg-\[#131525\] text-white flex flex-col px-5 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="flex items-center gap-2 pt-5 pb-3">
        <span className="text-indigo-400 font-black">◈</span>
        <span className="font-black text-sm">Modelion</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 py-6">
        {/* Character */}
        <div className="flex flex-col items-center gap-3">
          <div className="animate-mio-jump">
            <MioIllustration expression="correct" size={130} />
          </div>
          <div className="relative mt-1">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 rounded-sm" />
            <div className="bg-white text-slate-800 rounded-2xl px-5 py-3 shadow-lg text-sm font-semibold text-center max-w-xs leading-relaxed">
              分析完了！🎯<br />
              あなたにぴったりのクエストが見つかった！<br />
              <span className="text-indigo-600 font-bold">一緒に体験してみよう！</span>
            </div>
          </div>
        </div>

        {/* Recommended card */}
        <div className="w-full max-w-sm">
          <p className="text-center text-[10px] text-slate-500 mb-3 uppercase tracking-widest font-mono">
            おすすめクエスト
          </p>
          <div
            className="rounded-2xl border-2 p-5 mb-5"
            style={{ borderColor: `${rec.accent}60`, background: `${rec.accent}10` }}
          >
            <div className="flex items-start gap-4 mb-3">
              <span className="text-4xl flex-shrink-0">{rec.emoji}</span>
              <div>
                <p className="font-black text-white text-sm leading-snug">{rec.title}</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{rec.desc}</p>
              </div>
            </div>
            {answers.time && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>⏱</span>
                <span>
                  目標:{' '}
                  <span className="text-slate-300 font-medium">{timeLabel[answers.time] ?? ''}</span>
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Link
              href={`/quest/${rec.questId}`}
              className="flex items-center justify-center w-full py-4 rounded-2xl font-black text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: '#06B6D4', boxShadow: '0 5px 0 #0891B2' }}
            >
              ▶ クエストを始める（アカウント不要）
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center w-full py-4 rounded-2xl font-bold text-sm border-2 border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all"
            >
              アカウントを作って進捗を保存する
            </Link>
          </div>
          <p className="text-center text-slate-700 text-[10px] mt-4">アカウント不要で今すぐ体験できます</p>
        </div>
      </div>
    </div>
  );
}

function DuoButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full py-4 rounded-2xl font-black text-base transition-all duration-200
        ${disabled
          ? 'text-slate-600 cursor-not-allowed'
          : 'text-white cursor-pointer hover:scale-[1.02] active:translate-y-[2px]'
        }
      `}
      style={
        disabled
          ? { background: '#1e293b', boxShadow: '0 5px 0 #0f172a' }
          : { background: '#06B6D4', boxShadow: '0 5px 0 #0891B2' }
      }
    >
      {children}
    </button>
  );
}

// ── Main quiz screen ──────────────────────────────────────────────────

export default function StartPage() {
  const [screen, setScreen] = useState<'welcome' | 'quiz' | 'result'>('welcome');
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [jumped, setJumped] = useState(false);

  const step = STEPS[stepIdx];
  const selectedOpt = step?.options.find(o => o.value === selected);
  const isSelected = selected !== null;

  const mioExpression: MioExpression = isSelected ? 'excited' : step?.expression ?? 'happy';
  const mioMessage = isSelected
    ? (selectedOpt?.feedback ?? 'いいね！その選択！')
    : (step?.mioMessage ?? '');

  function handleSelect(value: string) {
    if (transitioning || selected !== null) return;
    setSelected(value);
    setJumped(true);
    playSelectSound();
    setTimeout(() => setJumped(false), 600);
  }

  const handleNext = useCallback(() => {
    if (!isSelected || transitioning) return;
    setTransitioning(true);
    const newAnswers = { ...answers, [step.id]: selected! };
    setAnswers(newAnswers);

    setFadeIn(false);
    setTimeout(() => {
      setSelected(null);
      setTransitioning(false);
      if (stepIdx < STEPS.length - 1) {
        setStepIdx(i => i + 1);
      } else {
        setScreen('result');
      }
      setFadeIn(true);
    }, 200);
  }, [isSelected, transitioning, answers, step, selected, stepIdx]);

  function handleBack() {
    if (transitioning) return;
    setTransitioning(true);
    setFadeIn(false);
    setTimeout(() => {
      setSelected(null);
      setTransitioning(false);
      if (stepIdx === 0) {
        setScreen('welcome');
      } else {
        setStepIdx(i => i - 1);
      }
      setFadeIn(true);
    }, 200);
  }

  if (screen === 'welcome') return <WelcomeScreen onStart={() => setScreen('quiz')} />;

  const rec = RECOMMENDATIONS[answers.goal ?? 'pipeline'] ?? RECOMMENDATIONS.pipeline;
  if (screen === 'result') return <ResultScreen rec={rec} answers={answers} />;

  const fillPct = (stepIdx / STEPS.length) * 100 + (isSelected ? (1 / STEPS.length) * 100 : 0);

  return (
    <div className="min-h-screen bg-\[#131525\] text-white flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="text-slate-500 hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0"
          aria-label="戻る"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Progress bar */}
        <div className="flex-1 h-[14px] rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${fillPct}%`,
              background: '#06B6D4',
              boxShadow: '0 0 8px rgba(6,182,212,0.5)',
            }}
          />
        </div>

        <Link href="/signup" className="text-slate-600 hover:text-slate-400 text-xs transition-colors flex-shrink-0 px-1">
          スキップ
        </Link>
      </div>

      {/* ── Main content ── */}
      <div
        className="flex-1 flex flex-col px-5 pb-28 gap-6 transition-opacity duration-200"
        style={{ opacity: fadeIn ? 1 : 0 }}
      >

        {/* Character + speech bubble row */}
        <div className="flex items-start gap-4 pt-2">
          <div
            className={`flex-shrink-0 ${jumped ? 'animate-mio-jump' : 'animate-idle-bob'}`}
            key={jumped ? 'jumped' : 'idle'}
          >
            <MioIllustration expression={mioExpression} size={90} />
          </div>
          <div className="flex-1 pt-3">
            <SpeechBubble message={mioMessage} />
          </div>
        </div>

        {/* Question */}
        <h2 className="text-xl font-black text-white leading-snug">{step.question}</h2>

        {/* Options */}
        <div className={`grid gap-3 ${step.cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {step.options.map(opt => {
            const isSel = selected === opt.value;
            const isDisabled = selected !== null && !isSel;

            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                disabled={isDisabled}
                className={`
                  relative rounded-2xl border-2 transition-all duration-150 select-none text-left
                  ${step.cols === 2
                    ? 'flex flex-col items-center justify-center gap-2 py-6 px-3 text-center'
                    : 'flex items-center gap-4 px-5 py-4'
                  }
                  ${isSel
                    ? 'border-cyan-500 bg-cyan-500/10 scale-[0.96]'
                    : isDisabled
                    ? 'border-slate-800 bg-slate-900/30 opacity-40 cursor-default'
                    : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-800/80 active:scale-[0.97] cursor-pointer'
                  }
                `}
              >
                {/* Emoji */}
                <span className={`flex-shrink-0 ${step.cols === 2 ? 'text-3xl' : 'text-2xl'}`}>
                  {opt.icon}
                </span>

                {/* Text */}
                <div className={step.cols === 1 ? 'flex-1' : ''}>
                  <span
                    className={`font-bold leading-snug whitespace-pre-line text-white ${step.cols === 2 ? 'text-xs' : 'text-sm'}`}
                  >
                    {opt.label}
                  </span>
                  {opt.sublabel && step.cols === 1 && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{opt.sublabel}</p>
                  )}
                </div>

                {/* Selected checkmark */}
                {isSel && step.cols === 1 && (
                  <div className="ml-auto w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                {isSel && step.cols === 2 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center shadow-md">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5 3.5-3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom bar: 次へ button ── */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/90 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <DuoButton onClick={handleNext} disabled={!isSelected}>
            次へ →
          </DuoButton>
        </div>
      </div>
    </div>
  );
}
