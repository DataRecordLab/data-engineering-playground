'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTodayMissions, getDailyProgress, completeDailyMission, type MissionDef } from '@/lib/daily/missions';

interface CheckinResponse {
  streakCount: number;
  milestone: { days: number; xp: number } | null;
  alreadyCheckedIn: boolean;
}

export function DailyMissionPanel() {
  const [missions, setMissions] = useState<MissionDef[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [milestone, setMilestone] = useState<{ days: number; xp: number } | null>(null);
  const [milestoneVisible, setMilestoneVisible] = useState(false);

  const refreshCompleted = useCallback(() => {
    setCompleted(getDailyProgress().completed);
  }, []);

  useEffect(() => {
    setMissions(getTodayMissions());
    refreshCompleted();

    fetch('/api/daily/checkin', { method: 'POST' })
      .then(r => r.json())
      .then((data: CheckinResponse) => {
        setStreakCount(data.streakCount);
        if (data.milestone) {
          setMilestone(data.milestone);
          setMilestoneVisible(true);
          setTimeout(() => setMilestoneVisible(false), 6000);
        }
        if (!data.alreadyCheckedIn) {
          completeDailyMission('daily_login');
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => refreshCompleted();
    window.addEventListener('daily-mission-update', handler);
    return () => window.removeEventListener('daily-mission-update', handler);
  }, [refreshCompleted]);

  const allDone = missions.length > 0 && missions.every(m => completed.includes(m.id));
  const doneCount = missions.filter(m => completed.includes(m.id)).length;

  const isHot  = streakCount >= 7;
  const isWarm = streakCount >= 3;

  return (
    <div className="mx-2 mb-2 rounded-xl overflow-hidden border border-slate-800/60" style={{ background: 'rgba(15,15,25,0.8)' }}>
      {/* Milestone banner */}
      {milestoneVisible && milestone && (
        <div
          className="px-3 py-2 text-center"
          style={{
            background: 'linear-gradient(90deg, rgba(251,191,36,0.15), rgba(249,115,22,0.15))',
            borderBottom: '1px solid rgba(251,191,36,0.2)',
            animation: 'mission-appear 0.4s ease-out forwards',
          }}
        >
          <p className="text-[10px] font-black text-amber-400">
            🎉 {milestone.days}日連続ログイン達成！ +{milestone.xp} XP
          </p>
        </div>
      )}

      {/* Header: streak */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">デイリーミッション</p>
        {streakCount > 0 && (
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black border ${
              isHot
                ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                : isWarm
                ? 'border-amber-500/40 bg-amber-500/8 text-amber-400'
                : 'border-slate-700/50 bg-slate-800/40 text-slate-400'
            }`}
          >
            <span style={{ animation: isHot ? 'streak-flame 1.2s ease-in-out infinite' : undefined }}>🔥</span>
            <span>{streakCount}日</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-slate-600">{doneCount}/{missions.length} 完了</span>
          {allDone && <span className="text-[9px] text-emerald-500 font-bold">✓ ALL DONE</span>}
        </div>
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${missions.length > 0 ? (doneCount / missions.length) * 100 : 0}%`,
              background: allDone
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #3b82f6, #6366f1)',
            }}
          />
        </div>
      </div>

      {/* Mission list */}
      <div className="px-2 pb-2 pt-1 space-y-1">
        {missions.map(m => {
          const done = completed.includes(m.id);
          return (
            <div
              key={m.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-300"
              style={{
                background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)'}`,
                opacity: done ? 0.75 : 1,
              }}
            >
              <span className="text-xs flex-shrink-0">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-semibold leading-tight truncate ${done ? 'text-emerald-400 line-through' : 'text-slate-300'}`}>
                  {m.title}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-[9px] font-bold ${done ? 'text-emerald-500' : 'text-slate-600'}`}>
                  +{m.xp}
                </span>
                {done && <span className="text-emerald-500 text-[10px]">✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
