'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlayerPortrait } from '@/components/characters/PlayerPortrait';
import { MioIllustration } from '@/components/characters/MioIllustration';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useGameStore } from '@/lib/store/gameStore';
import {
  DEFAULT_CHARACTER_CONFIG,
  PRESET_CHARACTERS,
  type CharacterConfig,
  type OutfitStyle,
  type JobTitle,
} from '@/types';

// ── カラーパレット ───────────────────────────────────────────────────────────

const MANE_COLORS = [
  { hex: '#92400E', label: 'ブラウン' },
  { hex: '#B45309', label: 'アンバー' },
  { hex: '#6B4226', label: 'ダークブラウン' },
  { hex: '#1C0A00', label: 'ブラック' },
  { hex: '#D97706', label: 'ゴールド' },
  { hex: '#78350F', label: 'チョコ' },
];

const OUTFIT_COLORS_FREE = ['#2563EB', '#1F2937', '#059669'];
const OUTFIT_COLORS_PRO  = ['#2563EB', '#1F2937', '#059669', '#7C3AED', '#DC2626', '#D97706', '#0F766E', '#EC4899'];
const GLASSES_COLORS     = ['#93C5FD', '#6EE7B7', '#FCA5A5', '#FCD34D'];

const OUTFIT_STYLES: { id: OutfitStyle; label: string; pro?: boolean }[] = [
  { id: 'hoodie',  label: 'パーカー' },
  { id: 'tee',     label: 'Tシャツ' },
  { id: 'jacket',  label: 'ジャケット', pro: true },
  { id: 'suit',    label: 'スーツ',     pro: true },
];

const JOB_TITLES: JobTitle[] = ['Data Engineer', 'Analytics Engineer', 'Data Scientist', 'Data Architect'];

// ── Sub-components ───────────────────────────────────────────────────────────

function ColorDot({ color, label, selected, onClick, locked }: {
  color: string; label?: string; selected: boolean; onClick: () => void; locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={locked ? 'Proプランで解放' : (label ?? color)}
      disabled={locked}
      className={`relative w-7 h-7 rounded-full border-2 transition-transform ${
        selected ? 'border-white scale-125' : 'border-transparent hover:scale-110'
      } ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ backgroundColor: color }}
    >
      {locked && <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]">🔒</span>}
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
          : 'bg-[#1a1d2e] border-[#272b42] text-[#8890b0] hover:border-[#343856]'
      } ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {locked ? `🔒 ${label}` : label}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState<JobTitle>('Data Engineer');
  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);
  const [saving, setSaving] = useState(false);
  const isPro = false;

  const { setCharacterConfig } = useGameStore();

  useEffect(() => {
    async function loadSaved() {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('users')
          .select('display_name, character_config')
          .eq('id', user.id)
          .single();
        if (data) {
          if (data.display_name) setDisplayName(data.display_name);
          if (data.character_config) {
            const saved = data.character_config as CharacterConfig;
            setConfig(prev => ({ ...prev, ...saved }));
            if (saved.jobTitle) setJobTitle(saved.jobTitle);
          }
        }
      } else {
        const saved = localStorage.getItem('dc_character');
        if (saved) {
          const parsed = JSON.parse(saved) as CharacterConfig & { displayName?: string };
          if (parsed.displayName) setDisplayName(parsed.displayName);
          setConfig(prev => ({ ...prev, ...parsed }));
          if (parsed.jobTitle) setJobTitle(parsed.jobTitle);
        }
      }
    }
    loadSaved();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(partial: Partial<CharacterConfig>) {
    setConfig(prev => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    setSaving(true);
    const finalConfig: CharacterConfig = { ...config, jobTitle };

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const invitedOrgId = (user.user_metadata?.invited_org_id as string | undefined) ?? null;
        await supabase.from('users').upsert({
          id:               user.id,
          display_name:     displayName.trim() || 'Engineer',
          character_config: finalConfig,
          onboarding_done:  true,
          plan:             'free',
          level:            1,
          total_xp:         0,
          ...(invitedOrgId ? { organization_id: invitedOrgId } : {}),
        });
      }
    } else {
      localStorage.setItem('dc_character', JSON.stringify({ ...finalConfig, displayName: displayName.trim() || 'Engineer' }));
    }

    setCharacterConfig(finalConfig);
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#131525] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-[#272b42] bg-[#0f1220]/90">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400 text-xl font-bold" style={{ textShadow: '0 0 12px rgba(129,140,248,0.7)' }}>◈</span>
          <span className="font-black tracking-tight">Modelion</span>
          <span className="text-[#555b7a] text-sm">データワールド</span>
        </div>
        <span className="text-[#555b7a] text-xs">キャラクター作成</span>
      </header>

      {/* Lio greeting */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-2">
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#1a1d2e] border border-[#272b42]">
          <div className="flex-shrink-0 animate-idle-bob">
            <MioIllustration expression="excited" size={72} />
          </div>
          <div>
            <p className="text-[#555b7a] text-xs mb-1">Lio — あなたの相棒</p>
            <p className="text-white text-sm leading-relaxed">
              「データワールドへようこそ！まずはあなたのライオンキャラクターをカスタマイズしよう！」
            </p>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-6 pb-[88px] lg:pb-6">

        {/* Preview + presets — mobile: horizontal strip, desktop: left column */}
        <div className="flex flex-col md:grid md:grid-cols-[200px_1fr] gap-6 md:gap-8">

          <div className="space-y-4">
            {/* Preview card */}
            <div className="flex md:flex-col items-center gap-4 md:gap-3 p-4 md:p-6 rounded-2xl bg-[#1a1d2e] border border-[#272b42]">
              <div className="flex-shrink-0">
                <PlayerPortrait config={config} size={100} animate />
              </div>
              <div className="flex-1 md:text-center">
                <p className="text-white text-sm font-bold">{displayName.trim() || 'あなた'}</p>
                <p className="text-[#555b7a] text-xs mt-0.5">{jobTitle}</p>
                {/* Presets inline on mobile */}
                <div className="flex md:hidden flex-wrap gap-1.5 mt-3">
                  {PRESET_CHARACTERS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => { setConfig(preset.config); if (preset.config.jobTitle) setJobTitle(preset.config.jobTitle); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#272b42] bg-[#0f1220] hover:border-[#343856] text-[#8890b0] text-[11px] transition-colors"
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: preset.config.hairColor ?? '#92400E' }} />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Presets desktop */}
            <div className="hidden md:block">
              <p className="text-[#555b7a] text-xs mb-2 font-mono uppercase tracking-wider">プリセット</p>
              <div className="space-y-2">
                {PRESET_CHARACTERS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => { setConfig(preset.config); if (preset.config.jobTitle) setJobTitle(preset.config.jobTitle); }}
                    className="w-full text-left px-3 py-2 rounded-xl border border-[#272b42] bg-[#1a1d2e] hover:border-[#343856] text-[#8890b0] text-xs transition-colors flex items-center gap-2"
                  >
                    <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: preset.config.hairColor ?? '#92400E' }} />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="space-y-5">

          {/* Name */}
          <div>
            <label className="block text-[#8890b0] text-xs mb-1.5 font-mono uppercase tracking-wider">表示名</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="あなたの名前..."
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1a1d2e] border border-[#272b42] text-white text-sm placeholder:text-[#555b7a] focus:outline-none focus:border-[#1CB0F6] transition-colors"
            />
          </div>

          {/* Mane color */}
          <div>
            <label className="block text-[#8890b0] text-xs mb-2 font-mono uppercase tracking-wider">たてがみの色</label>
            <div className="flex flex-wrap gap-2">
              {MANE_COLORS.map(({ hex, label }) => (
                <ColorDot key={hex} color={hex} label={label} selected={config.hairColor === hex} onClick={() => patch({ hairColor: hex })} />
              ))}
            </div>
          </div>

          {/* Outfit style */}
          <div>
            <label className="block text-[#8890b0] text-xs mb-2 font-mono uppercase tracking-wider">衣装スタイル</label>
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
            <label className="block text-[#8890b0] text-xs mb-2 font-mono uppercase tracking-wider">衣装カラー</label>
            <div className="flex flex-wrap gap-2">
              {OUTFIT_COLORS_FREE.map(c => (
                <ColorDot key={c} color={c} selected={config.outfitColor === c} onClick={() => patch({ outfitColor: c })} />
              ))}
              {OUTFIT_COLORS_PRO.slice(OUTFIT_COLORS_FREE.length).map(c => (
                <ColorDot key={c} color={c} selected={config.outfitColor === c} onClick={() => patch({ outfitColor: c })} locked={!isPro} />
              ))}
            </div>
          </div>

          {/* Glasses */}
          <div>
            <label className="block text-[#8890b0] text-xs mb-2 font-mono uppercase tracking-wider">眼鏡</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hasGlasses}
                  onChange={e => patch({ hasGlasses: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className="text-[#e8eaf6] text-sm">あり</span>
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

          {/* Job title */}
          <div>
            <label className="block text-[#8890b0] text-xs mb-2 font-mono uppercase tracking-wider">職種タイトル</label>
            <div className="flex flex-wrap gap-2">
              {JOB_TITLES.map(t => (
                <StyleButton key={t} label={t} selected={jobTitle === t} onClick={() => setJobTitle(t)} />
              ))}
            </div>
          </div>

          {/* Pro upsell */}
          {!isPro && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <span className="text-purple-400 text-lg">✦</span>
              <div className="flex-1 min-w-0">
                <p className="text-purple-300 text-xs font-bold">Proプランで全スタイル・全色解放</p>
                <p className="text-[#555b7a] text-xs">¥980/月 · 全クエスト + AI無制限</p>
              </div>
              <a href="/upgrade" className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors">
                解放する
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => router.push('/dashboard')} className="text-[#555b7a] hover:text-[#8890b0] text-sm transition-colors">
              スキップ
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 sm:px-8 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: '#58CC02', boxShadow: '0 5px 0 #46a302' }}
            >
              {saving ? '保存中...' : 'データワールドへ入る →'}
            </button>
          </div>
        </div>
        </div>{/* end grid */}
      </main>
    </div>
  );
}
