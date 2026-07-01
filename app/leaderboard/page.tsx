import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Sprite } from '@/components/characters/Sprite';
import { buildPlayerSprite } from '@/components/characters/sprites/playerCustom';
import { DEFAULT_CHARACTER_CONFIG } from '@/types';
import { StreakBadge } from '@/components/streak/StreakBadge';
import type { CharacterConfig } from '@/types';

interface UserRow {
  id: string;
  display_name: string | null;
  level: number;
  total_xp: number;
  streak_count: number;
  character_config: CharacterConfig | null;
}

const XP_PER_LEVEL = 500;

function XpBar({ xp, level }: { xp: number; level: number }) {
  const xpInLevel = xp % XP_PER_LEVEL;
  const pct = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100));
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{xp} XP</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="text-slate-500 text-sm font-mono w-6 text-center">{rank}</span>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();

  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, level, total_xp, streak_count, character_config')
    .order('total_xp', { ascending: false })
    .limit(50);

  const rows = (users ?? []) as UserRow[];

  // 自分のランク
  const myRank = me ? rows.findIndex(u => u.id === me.id) + 1 : 0;
  const myRow = me ? rows.find(u => u.id === me.id) : null;

  return (
    <div className="min-h-screen bg-[#070910] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <Link
            href={me ? '/dashboard' : '/'}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
          >
            ← {me ? 'ダッシュボード' : 'トップへ'}
          </Link>
          <span className="text-slate-800">|</span>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-lg">🏆</span>
            <span className="font-black text-sm">リーダーボード</span>
          </div>
        </div>
        {!me && (
          <Link
            href="/signup"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
          >
            参加してランク入り →
          </Link>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* タイトル */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black">Total XP ランキング</h1>
          <p className="text-slate-500 text-sm">クエスト・スキルパス・Debug Lab で XP を積み上げよう</p>
        </div>

        {/* 自分の順位（ログイン時 & ランク圏外の場合） */}
        {me && myRow && myRank > 10 && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 flex items-center gap-3">
            <span className="text-slate-400 text-sm font-mono w-8 text-center">{myRank}位</span>
            <span className="text-slate-300 text-sm font-bold">あなたの現在の順位</span>
            <span className="ml-auto text-indigo-400 font-bold text-sm">{myRow.total_xp} XP</span>
          </div>
        )}

        {/* ランキング本体 */}
        <div className="space-y-2">
          {rows.map((u, i) => {
            const rank = i + 1;
            const isMe = me?.id === u.id;
            const config = u.character_config ?? DEFAULT_CHARACTER_CONFIG;
            const grid = buildPlayerSprite(config);
            const name = u.display_name ?? `Engineer #${rank}`;

            return (
              <div
                key={u.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                  isMe
                    ? 'border-indigo-500/40 bg-indigo-500/8'
                    : rank <= 3
                    ? 'border-yellow-500/20 bg-yellow-500/3'
                    : 'border-slate-800/60 bg-slate-900/30'
                }`}
              >
                {/* 順位 */}
                <div className="w-8 flex justify-center flex-shrink-0">
                  <RankBadge rank={rank} />
                </div>

                {/* キャラクター */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                  <Sprite grid={grid} scale={2} />
                </div>

                {/* 名前 + XPバー */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold truncate ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                      {name}
                      {isMe && <span className="text-indigo-400 text-[10px] ml-1">（あなた）</span>}
                    </span>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">Lv.{u.level}</span>
                    {(u.streak_count ?? 0) >= 3 && (
                      <StreakBadge count={u.streak_count ?? 0} size="sm" />
                    )}
                  </div>
                  <XpBar xp={u.total_xp ?? 0} level={u.level ?? 1} />
                </div>

                {/* XP数値（トップ3は強調） */}
                {rank <= 3 && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-yellow-400 font-black text-base">{(u.total_xp ?? 0).toLocaleString()}</p>
                    <p className="text-slate-600 text-[9px]">XP</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 未ログインCTA */}
        {!me && (
          <div
            className="rounded-2xl border border-indigo-500/20 p-6 text-center space-y-4"
            style={{ background: 'linear-gradient(135deg, #0c0c2a 0%, #0a0618 100%)' }}
          >
            <p className="text-white font-black text-base">あなたもランキングに参加しよう</p>
            <p className="text-slate-400 text-sm">
              無料で登録してクエストをクリアすれば、あなたのXPがランキングに反映されます。
            </p>
            <Link
              href="/signup"
              className="block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-[1.02]"
            >
              ▶ 無料で始める
            </Link>
          </div>
        )}

        <p className="text-center text-slate-700 text-xs">
          上位{rows.length}名を表示 · XPはリアルタイムに更新
        </p>
      </div>
    </div>
  );
}
