'use client';

import { useEffect, useState } from 'react';
import { getTodayMissions } from '@/lib/daily/missions';

interface ToastItem {
  id: string;
  missionId: string;
  icon: string;
  title: string;
  xp: number;
}

export function MissionToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const missions = getTodayMissions();
    const missionMap = Object.fromEntries(missions.map(m => [m.id, m]));

    const handler = (e: Event) => {
      const { missionId } = (e as CustomEvent<{ missionId: string; completed: string[] }>).detail;
      const mission = missionMap[missionId];
      if (!mission) return;

      const toastId = `${missionId}-${Date.now()}`;
      const item: ToastItem = { id: toastId, missionId, icon: mission.icon, title: mission.title, xp: mission.xp };

      setToasts(prev => [...prev, item]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 3500);
    };

    window.addEventListener('daily-mission-update', handler);
    return () => window.removeEventListener('daily-mission-update', handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.35)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            animation: 'mission-appear 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
          }}
        >
          <span className="text-lg">{t.icon}</span>
          <div>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">ミッション達成！</p>
            <p className="text-white text-sm font-semibold leading-tight">{t.title}</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span className="text-emerald-400 text-xs font-black">+{t.xp} XP</span>
          </div>
        </div>
      ))}
    </div>
  );
}
