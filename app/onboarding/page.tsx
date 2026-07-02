'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sprite } from '@/components/characters/Sprite';
import { buildPlayerSprite } from '@/components/characters/sprites/playerCustom';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  DEFAULT_CHARACTER_CONFIG,
  PRESET_CHARACTERS,
  type CharacterConfig,
  type HairStyle,
  type OutfitStyle,
  type JobTitle,
} from '@/types';

// ─── Color palettes ───────────────────────────────────────────────────────────

const SKIN_TONES = ['#FDDCB0', '#F5CBA7', '#D4A574', '#8D5524', '#3D1A00'];
const HAIR_COLORS = ['#2C1A0E', '#6B4226', '#C87941', '#E5C696', '#E5E7EB', '#DC2626', '#7C3AED', '#0EA5E9'];
const OUTFIT_COLORS_FREE = ['#4A90D9', '#1F2937', '#065F46'];
const OUTFIT_COLORS_PRO = ['#4A90D9', '#1F2937', '#065F46', '#7C3AED', '#DC2626', '#D97706', '#0F766E', '#EC4899'];
const GLASSES_COLORS = ['#93C5FD', '#6EE7B7', '#FCA5A5', '#FCD34D'];
const HAIR_STYLES: { id: HairStyle; label: string; pro?: boolean }[] = [
  { id: 'short', label: 'ショート' },
  { id: 'flat', label: 'フラット' },
  { id: 'spiky', label: 'スパイク', pro: true },
  { id: 'long', label: 'ロング', pro: true },
];
const OUTFIT_STYLES: { id: OutfitStyle; label: string; pro?: boolean }[] = [
  { id: 'hoodie', label: 'フーディー' },
  { id: 'tee', label: 'Tシャツ' },
  { id: 'jacket', label: 'ジャケット', pro: true },
  { id: 'suit', label: 'スーツ', pro: true },
];
const JOB_TITLES: JobTitle[] = ['Data Engineer', 'Analytics Engineer', 'Data Scientist', 'Data Architect'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorDot({ color, selected, onClick, locked }: {
  color: string; selected: boolean; onClick: () => void; locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={locked ? 'Proプランで解放' : color}
      className={`relative w-6 h-6 rounded-full border-2 transition-transform ${
        selected ? 'border-white scale-125' : 'border-transparent hover:scale-110'
      } ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ backgroundColor: color }}
      disabled={locked}
    >
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]">🔒</span>
      )}
    </button>
  );
}

function StyleButton({ label, selected, onClick, locked }: {
  label: string; selected: boolean; onClick: () => void; locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        selected
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
      } ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {locked ? `🔒 ${label}` : label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState<JobTitle>('Data Engineer');
  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);
  const [saving, setSaving] = useState(false);
  // For now always treat as free plan (pro check will come from Supabase)
  const isPro = false;

  const sprite = useMemo(() => buildPlayerSprite(config), [config]);

  function patch(partial: Partial<CharacterConfig>) {
    setConfig(prev => ({ ...prev, ...partial }));
  }

  function applyPreset(presetConfig: CharacterConfig) {
    setConfig(presetConfig);
  }

  async function handleSave() {
    setSaving(true);
    const characterData = { ...config, jobTitle, displayName: displayName.trim() || 'Engineer' };

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').upsert({
          id: user.id,
          display_name: characterData.displayName,
          character_config: { ...config, jobTitle },
          onboarding_done: true,
          plan: 'free',
          level: 1,
          total_xp: 0,
        });
      }
    } else {
      // Dev mode: persist to localStorage
      localStorage.setItem('dc_character', JSON.stringify(characterData));
    }

    router.push('/dashboard');
  }

  function handleSkip() {
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#050914] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-xl font-bold">◈</span>
          <span className="font-bold tracking-tight">Modelion</span>
        </div>
        <span className="text-slate-600 text-xs">キャラクター作成</span>
      </header>

      {/* Tanaka greeting */}
      <div className="max-w-3xl mx-auto px-8 pt-8 pb-2">
        <div className="flex items-start gap-4 px-5 py-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex-shrink-0 text-3xl">🧑‍💻</div>
          <div>
            <p className="text-slate-400 text-xs mb-1">田中 貢 — Senior Data Engineer</p>
            <p className="text-white text-sm leading-relaxed">
              「Modelion Agencyへようこそ。まずあなた自身を教えてくれ。名前と外見を設定したら入社できる。」
            </p>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-8 py-6 grid grid-cols-[200px_1fr] gap-8">

        {/* Left: sprite preview + presets */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="animate-idle-bob">
              <Sprite grid={sprite} scale={6} />
            </div>
            <p className="text-slate-400 text-xs text-center">
              {displayName.trim() || 'あなた'}
              <br />
              <span className="text-slate-600">{jobTitle}</span>
            </p>
          </div>

          {/* Presets */}
          <div>
            <p className="text-slate-500 text-xs mb-2">プリセット</p>
            <div className="space-y-2">
              {PRESET_CHARACTERS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.config)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/60 hover:border-slate-600 text-slate-300 text-xs transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: customization form */}
        <div className="space-y-5">

          {/* Name */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">表示名</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="あなたの名前..."
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Job title */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">職種タイトル</label>
            <div className="flex flex-wrap gap-2">
              {JOB_TITLES.map(t => (
                <StyleButton key={t} label={t} selected={jobTitle === t} onClick={() => setJobTitle(t)} />
              ))}
            </div>
          </div>

          {/* Skin */}
          <div>
            <label className="block text-slate-400 text-xs mb-2">肌の色</label>
            <div className="flex gap-2">
              {SKIN_TONES.map(c => (
                <ColorDot key={c} color={c} selected={config.skinTone === c} onClick={() => patch({ skinTone: c })} />
              ))}
            </div>
          </div>

          {/* Hair style */}
          <div>
            <label className="block text-slate-400 text-xs mb-2">髪型</label>
            <div className="flex flex-wrap gap-2">
              {HAIR_STYLES.map(s => (
                <StyleButton
                  key={s.id}
                  label={s.label}
                  selected={config.hairStyle === s.id}
                  onClick={() => patch({ hairStyle: s.id })}
                  locked={s.pro && !isPro}
                />
              ))}
            </div>
          </div>

          {/* Hair color */}
          <div>
            <label className="block text-slate-400 text-xs mb-2">髪の色</label>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((c, i) => (
                <ColorDot key={c} color={c} selected={config.hairColor === c} onClick={() => patch({ hairColor: c })} locked={i > 3 && !isPro} />
              ))}
            </div>
          </div>

          {/* Outfit style */}
          <div>
            <label className="block text-slate-400 text-xs mb-2">服装</label>
            <div className="flex flex-wrap gap-2">
              {OUTFIT_STYLES.map(s => (
                <StyleButton
                  key={s.id}
                  label={s.label}
                  selected={config.outfitStyle === s.id}
                  onClick={() => patch({ outfitStyle: s.id })}
                  locked={s.pro && !isPro}
                />
              ))}
            </div>
          </div>

          {/* Outfit color */}
          <div>
            <label className="block text-slate-400 text-xs mb-2">服の色</label>
            <div className="flex flex-wrap gap-2">
              {(isPro ? OUTFIT_COLORS_PRO : OUTFIT_COLORS_FREE).map((c, i) => (
                <ColorDot key={c} color={c} selected={config.outfitColor === c} onClick={() => patch({ outfitColor: c })} locked={!isPro && i >= OUTFIT_COLORS_FREE.length} />
              ))}
              {!isPro && OUTFIT_COLORS_PRO.slice(OUTFIT_COLORS_FREE.length).map(c => (
                <ColorDot key={c} color={c} selected={false} onClick={() => {}} locked />
              ))}
            </div>
          </div>

          {/* Glasses */}
          <div>
            <label className="block text-slate-400 text-xs mb-2">眼鏡</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hasGlasses}
                  onChange={e => patch({ hasGlasses: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className="text-slate-300 text-sm">あり</span>
              </label>
              {config.hasGlasses && (
                <div className="flex gap-2">
                  {GLASSES_COLORS.map(c => (
                    <ColorDot key={c} color={c} selected={config.glassesColor === c} onClick={() => patch({ glassesColor: c })} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pro upsell banner */}
          {!isPro && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <span className="text-purple-400 text-lg">✦</span>
              <div className="flex-1 min-w-0">
                <p className="text-purple-300 text-xs font-medium">Proプランで全スタイル・全色解放</p>
                <p className="text-slate-500 text-xs">¥980/月 · 全クエスト + AI無制限</p>
              </div>
              <a href="/upgrade" className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors">
                解放する
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={handleSkip} className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
              スキップ
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              {saving ? '保存中...' : 'Modelion Agencyに入社する →'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
