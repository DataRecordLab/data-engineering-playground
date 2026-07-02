'use client';

export type WorldType = 'cave' | 'grassland' | 'volcano' | 'castle' | null;

interface Props {
  worldType: WorldType;
}

// ── Cave particles ──
const STALACTITES = [
  { left: '3%',  h: 40, w: 6 }, { left: '8%',  h: 62, w: 5 },
  { left: '14%', h: 32, w: 7 }, { left: '20%', h: 55, w: 5 },
  { left: '26%', h: 44, w: 6 }, { left: '32%', h: 70, w: 5 },
  { left: '38%', h: 36, w: 8 }, { left: '45%', h: 52, w: 5 },
  { left: '51%', h: 42, w: 6 }, { left: '57%', h: 66, w: 5 },
  { left: '63%', h: 30, w: 7 }, { left: '69%', h: 58, w: 5 },
  { left: '75%', h: 46, w: 6 }, { left: '81%', h: 38, w: 5 },
  { left: '87%', h: 60, w: 7 }, { left: '93%', h: 34, w: 6 },
];
const CAVE_DRIPS = [
  { left: '4%',  dur: '2.8s', delay: '0s'   }, { left: '9%',  dur: '3.9s', delay: '1.1s' },
  { left: '15%', dur: '3.2s', delay: '0.6s' }, { left: '21%', dur: '4.5s', delay: '2.0s' },
  { left: '27%', dur: '2.9s', delay: '0.3s' }, { left: '33%', dur: '3.7s', delay: '1.6s' },
  { left: '39%', dur: '3.4s', delay: '2.8s' }, { left: '46%', dur: '4.8s', delay: '0.8s' },
  { left: '52%', dur: '2.7s', delay: '1.8s' }, { left: '58%', dur: '4.1s', delay: '1.3s' },
  { left: '64%', dur: '3.0s', delay: '0.2s' }, { left: '70%', dur: '3.5s', delay: '2.5s' },
  { left: '76%', dur: '4.3s', delay: '0.9s' }, { left: '82%', dur: '3.1s', delay: '3.2s' },
  { left: '88%', dur: '3.8s', delay: '0.5s' }, { left: '94%', dur: '2.6s', delay: '1.9s' },
];
const CRYSTALS = [
  { left: '2%',  h: 22, w: 7, delay: '0s'   }, { left: '5%',  h: 38, w: 6, delay: '0.6s' },
  { left: '9%',  h: 16, w: 8, delay: '1.2s' }, { left: '13%', h: 30, w: 6, delay: '0.3s' },
  { left: '17%', h: 45, w: 7, delay: '0.9s' }, { left: '21%', h: 18, w: 6, delay: '1.5s' },
  { left: '76%', h: 28, w: 7, delay: '0.4s' }, { left: '80%', h: 42, w: 6, delay: '0.8s' },
  { left: '84%', h: 20, w: 8, delay: '1.3s' }, { left: '88%', h: 35, w: 6, delay: '0.1s' },
  { left: '92%', h: 50, w: 7, delay: '0.7s' }, { left: '96%', h: 24, w: 6, delay: '1.6s' },
];

// ── Grassland particles ──
const GRASS_BLADES = [
  { left: 2,  h: 35, dur: '1.6s', delay: '0s'   }, { left: 5,  h: 50, dur: '1.9s', delay: '0.2s' },
  { left: 8,  h: 28, dur: '1.5s', delay: '0.5s' }, { left: 11, h: 42, dur: '2.0s', delay: '0.1s' },
  { left: 14, h: 58, dur: '1.7s', delay: '0.4s' }, { left: 17, h: 32, dur: '1.8s', delay: '0.7s' },
  { left: 20, h: 46, dur: '1.6s', delay: '0.3s' }, { left: 23, h: 65, dur: '2.1s', delay: '0.8s' },
  { left: 26, h: 38, dur: '1.5s', delay: '0.2s' }, { left: 29, h: 52, dur: '1.9s', delay: '0.6s' },
  { left: 32, h: 28, dur: '1.7s', delay: '0.1s' }, { left: 35, h: 44, dur: '2.0s', delay: '0.9s' },
  { left: 38, h: 60, dur: '1.6s', delay: '0.4s' }, { left: 41, h: 34, dur: '1.8s', delay: '0.5s' },
  { left: 44, h: 48, dur: '1.5s', delay: '0.0s' }, { left: 47, h: 26, dur: '2.1s', delay: '0.7s' },
  { left: 50, h: 55, dur: '1.7s', delay: '0.3s' }, { left: 53, h: 38, dur: '1.9s', delay: '0.8s' },
  { left: 56, h: 68, dur: '1.6s', delay: '0.2s' }, { left: 59, h: 32, dur: '2.0s', delay: '0.5s' },
  { left: 62, h: 50, dur: '1.8s', delay: '0.4s' }, { left: 65, h: 40, dur: '1.5s', delay: '0.9s' },
  { left: 68, h: 58, dur: '1.7s', delay: '0.1s' }, { left: 71, h: 30, dur: '2.1s', delay: '0.6s' },
  { left: 74, h: 46, dur: '1.6s', delay: '0.3s' }, { left: 77, h: 62, dur: '1.9s', delay: '0.7s' },
  { left: 80, h: 35, dur: '1.8s', delay: '0.2s' }, { left: 83, h: 48, dur: '1.5s', delay: '0.5s' },
  { left: 86, h: 28, dur: '2.0s', delay: '0.9s' }, { left: 89, h: 55, dur: '1.7s', delay: '0.0s' },
  { left: 92, h: 40, dur: '1.6s', delay: '0.4s' }, { left: 95, h: 52, dur: '1.9s', delay: '0.8s' },
  { left: 98, h: 32, dur: '1.8s', delay: '0.3s' },
];
const GRASSLAND_LEAVES = [
  { left: '4%',  dur: '6.0s', delay: '0s',   drift:  44, spin:  360 },
  { left: '11%', dur: '7.8s', delay: '1.9s', drift: -30, spin: -360 },
  { left: '19%', dur: '7.0s', delay: '4.1s', drift:  58, spin:  360 },
  { left: '27%', dur: '8.8s', delay: '1.3s', drift: -46, spin: -360 },
  { left: '35%', dur: '6.5s', delay: '5.8s', drift:  33, spin:  360 },
  { left: '43%', dur: '7.3s', delay: '3.0s', drift: -53, spin: -360 },
  { left: '51%', dur: '8.2s', delay: '0.7s', drift:  40, spin:  360 },
  { left: '59%', dur: '6.1s', delay: '5.2s', drift: -26, spin: -360 },
  { left: '67%', dur: '8.9s', delay: '2.5s', drift:  56, spin:  360 },
  { left: '75%', dur: '7.6s', delay: '6.9s', drift: -38, spin: -360 },
  { left: '83%', dur: '5.8s', delay: '1.1s', drift:  48, spin:  360 },
  { left: '91%', dur: '8.5s', delay: '4.5s', drift: -33, spin: -360 },
];

// ── Volcano particles ──
const EMBERS = [
  { left: '3%',  dur: '2.4s', delay: '0s',   drift:  18, sz: 4 }, { left: '8%',  dur: '3.1s', delay: '0.7s', drift: -22, sz: 3 },
  { left: '13%', dur: '1.9s', delay: '1.4s', drift:  14, sz: 5 }, { left: '18%', dur: '3.6s', delay: '0.2s', drift: -16, sz: 3 },
  { left: '23%', dur: '2.6s', delay: '2.0s', drift:  28, sz: 4 }, { left: '28%', dur: '2.2s', delay: '0.9s', drift: -10, sz: 5 },
  { left: '33%', dur: '3.4s', delay: '0.4s', drift:  20, sz: 3 }, { left: '38%', dur: '2.0s', delay: '1.7s', drift: -26, sz: 4 },
  { left: '43%', dur: '3.8s', delay: '0.6s', drift:   8, sz: 3 }, { left: '48%', dur: '2.5s', delay: '2.3s', drift: -18, sz: 5 },
  { left: '53%', dur: '2.9s', delay: '1.2s', drift:  24, sz: 4 }, { left: '58%', dur: '1.8s', delay: '0.1s', drift: -14, sz: 3 },
  { left: '63%', dur: '3.3s', delay: '1.6s', drift:  16, sz: 5 }, { left: '68%', dur: '2.7s', delay: '2.7s', drift: -28, sz: 4 },
  { left: '73%', dur: '2.1s', delay: '0.8s', drift:  22, sz: 3 }, { left: '78%', dur: '3.5s', delay: '1.3s', drift: -12, sz: 5 },
  { left: '83%', dur: '2.3s', delay: '0.3s', drift:  18, sz: 4 }, { left: '88%', dur: '4.0s', delay: '1.9s', drift: -20, sz: 3 },
  { left: '93%', dur: '2.8s', delay: '0.5s', drift:  12, sz: 5 }, { left: '97%', dur: '3.2s', delay: '2.8s', drift: -18, sz: 4 },
];
const LAVA_FLAMES = [
  { left: '5%',  h: 32, delay: '0s',    dur: '0.32s' }, { left: '10%', h: 20, delay: '0.08s', dur: '0.38s' },
  { left: '16%', h: 38, delay: '0.16s', dur: '0.35s' }, { left: '22%', h: 24, delay: '0.05s', dur: '0.40s' },
  { left: '28%', h: 42, delay: '0.12s', dur: '0.33s' }, { left: '34%', h: 18, delay: '0.20s', dur: '0.42s' },
  { left: '40%', h: 35, delay: '0.07s', dur: '0.36s' }, { left: '46%', h: 28, delay: '0.14s', dur: '0.39s' },
  { left: '52%', h: 45, delay: '0.02s', dur: '0.34s' }, { left: '58%', h: 22, delay: '0.18s', dur: '0.41s' },
  { left: '64%', h: 36, delay: '0.10s', dur: '0.37s' }, { left: '70%', h: 26, delay: '0.06s', dur: '0.43s' },
  { left: '76%', h: 40, delay: '0.15s', dur: '0.35s' }, { left: '82%', h: 20, delay: '0.22s', dur: '0.38s' },
  { left: '88%', h: 34, delay: '0.04s', dur: '0.36s' }, { left: '93%', h: 28, delay: '0.11s', dur: '0.40s' },
];

// ── Castle particles ──
const SPARKLES = [
  { left: '6%',  top: '18%', dur: '1.8s', delay: '0s'   }, { left: '13%', top: '52%', dur: '2.6s', delay: '1.2s' },
  { left: '20%', top: '28%', dur: '1.6s', delay: '0.4s' }, { left: '28%', top: '68%', dur: '2.9s', delay: '1.9s' },
  { left: '36%', top: '12%', dur: '2.2s', delay: '0.8s' }, { left: '43%', top: '42%', dur: '1.7s', delay: '1.6s' },
  { left: '51%', top: '58%', dur: '2.5s', delay: '0.2s' }, { left: '59%', top: '22%', dur: '2.0s', delay: '2.3s' },
  { left: '66%', top: '73%', dur: '1.5s', delay: '1.0s' }, { left: '74%', top: '32%', dur: '2.8s', delay: '0.6s' },
  { left: '81%', top: '52%', dur: '2.3s', delay: '1.8s' }, { left: '89%', top: '38%', dur: '1.9s', delay: '0.3s' },
  { left: '10%', top: '82%', dur: '2.7s', delay: '2.7s' }, { left: '47%', top: '88%', dur: '2.1s', delay: '1.4s' },
  { left: '70%', top: '10%', dur: '1.4s', delay: '3.1s' }, { left: '33%', top: '85%', dur: '2.4s', delay: '0.9s' },
  { left: '56%', top: '5%',  dur: '1.6s', delay: '2.0s' }, { left: '78%', top: '78%', dur: '2.9s', delay: '0.5s' },
];
const TORCH_POSITIONS = [
  { style: 'left: 20px; top: 28%'  },
  { style: 'left: 20px; top: 58%'  },
  { style: 'right: 20px; top: 28%' },
  { style: 'right: 20px; top: 58%' },
];

// ── SVG terrain paths ──
const CAVE_TERRAIN = 'M0,100 L0,68 C20,62 38,80 58,58 C78,36 96,70 116,50 C136,30 154,66 174,46 C194,26 212,63 232,44 C252,25 270,66 290,48 C310,30 328,66 348,48 C368,30 386,66 406,48 C426,30 444,66 464,48 C484,30 502,62 522,44 C542,26 560,66 580,48 C600,30 618,66 638,48 C658,30 676,64 696,46 C716,28 734,66 754,48 C774,30 792,66 812,50 C832,34 850,68 870,50 C890,32 908,66 928,48 C948,30 966,66 986,48 C1006,30 1024,64 1044,46 C1064,28 1082,66 1102,48 C1122,30 1140,66 1160,48 C1180,30 1198,64 1218,46 C1238,28 1256,66 1276,50 C1296,34 1314,68 1334,52 C1354,36 1372,68 1392,52 C1412,36 1428,68 1440,54 L1440,100 Z';

const GRASSLAND_TERRAIN = 'M0,100 L0,84 C24,76 48,92 72,80 C96,68 120,88 144,82 C168,76 192,90 216,84 C240,78 264,90 288,84 C312,78 336,90 360,82 C384,74 408,88 432,82 C456,76 480,90 504,84 C528,78 552,90 576,84 C600,78 624,90 648,82 C672,74 696,88 720,82 C744,76 768,90 792,84 C816,78 840,90 864,84 C888,78 912,90 936,82 C960,74 984,88 1008,82 C1032,76 1056,90 1080,84 C1104,78 1128,90 1152,82 C1176,74 1200,88 1224,82 C1248,76 1272,90 1296,84 C1320,78 1344,90 1368,82 L1440,82 L1440,100 Z';

const VOLCANO_TERRAIN = 'M0,100 L0,62 L22,82 L45,38 L68,70 L90,28 L112,62 L134,24 L156,58 L178,18 L200,52 L222,22 L244,60 L266,16 L288,52 L310,18 L332,58 L354,14 L376,50 L398,22 L420,58 L442,16 L464,52 L486,20 L508,58 L530,12 L552,50 L574,20 L596,56 L618,14 L640,52 L662,18 L684,58 L706,12 L728,50 L750,18 L772,56 L794,14 L816,52 L838,18 L860,58 L882,12 L904,50 L926,20 L948,58 L970,14 L992,52 L1014,18 L1036,58 L1058,14 L1080,52 L1102,20 L1124,60 L1146,16 L1168,54 L1190,22 L1212,60 L1234,18 L1256,56 L1278,22 L1300,58 L1322,18 L1344,52 L1366,20 L1388,58 L1420,32 L1440,48 L1440,100 Z';

const CASTLE_TERRAIN = 'M0,100 L0,72 L0,52 L36,52 L36,72 L72,72 L72,52 L108,52 L108,72 L144,72 L144,52 L180,52 L180,72 L216,72 L216,52 L252,52 L252,72 L288,72 L288,52 L324,52 L324,72 L360,72 L360,52 L396,52 L396,72 L432,72 L432,52 L468,52 L468,72 L504,72 L504,52 L540,52 L540,72 L576,72 L576,52 L612,52 L612,72 L648,72 L648,52 L684,52 L684,72 L720,72 L720,52 L756,52 L756,72 L792,72 L792,52 L828,52 L828,72 L864,72 L864,52 L900,52 L900,72 L936,72 L936,52 L972,52 L972,72 L1008,72 L1008,52 L1044,52 L1044,72 L1080,72 L1080,52 L1116,52 L1116,72 L1152,72 L1152,52 L1188,52 L1188,72 L1224,72 L1224,52 L1260,52 L1260,72 L1296,72 L1296,52 L1332,52 L1332,72 L1368,72 L1368,52 L1404,52 L1404,72 L1440,72 L1440,100 Z';

export function WorldAtmosphere({ worldType }: Props) {
  if (!worldType) return null;

  // ── CAVE ────────────────────────────────────────────────────────────────────
  if (worldType === 'cave') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep background layers */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 25% 100%, rgba(109,40,217,0.22) 0%, transparent 55%), radial-gradient(ellipse at 75% 100%, rgba(67,20,150,0.18) 0%, transparent 50%), radial-gradient(ellipse at 50% 0%, rgba(20,0,50,0.7) 0%, transparent 50%)' }} />
        {/* Breathing ambient glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(124,58,237,0.14) 0%, transparent 60%)', animation: 'ambient-breathe 3s ease-in-out infinite' }} />
        {/* Ceiling vignette */}
        <div className="absolute top-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to bottom, rgba(12,0,28,0.9) 0%, transparent 100%)' }} />
        {/* Ground purple glow */}
        <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: 'linear-gradient(to top, rgba(109,40,217,0.2) 0%, transparent 100%)' }} />

        {/* Stalactites */}
        {STALACTITES.map((s, i) => (
          <div key={i} className="absolute top-0" style={{ left: s.left, width: `${s.w}px`, height: `${s.h}px`, background: 'linear-gradient(to bottom, rgba(60,20,120,0.98), rgba(109,40,217,0.2))', borderRadius: '0 0 50% 50%' }} />
        ))}
        {/* Water drips */}
        {CAVE_DRIPS.map((d, i) => (
          <span key={i} className="absolute rounded-full" style={{ left: d.left, top: '-5px', width: '3px', height: '10px', background: 'rgba(196,181,253,0.9)', boxShadow: '0 0 8px rgba(124,58,237,0.8)', animation: `cave-drip ${d.dur} linear ${d.delay} infinite` }} />
        ))}

        {/* Crystal formations at corners */}
        {CRYSTALS.map((c, i) => (
          <div key={i} className="absolute bottom-[72px]" style={{ left: c.left, width: `${c.w}px`, height: `${c.h}px`, background: `linear-gradient(to top, #5b21b6, rgba(167,139,250,0.7))`, clipPath: 'polygon(50% 0%, 100% 60%, 70% 100%, 30% 100%, 0% 60%)', animation: `crystal-glow 2.2s ease-in-out ${c.delay} infinite`, color: '#7c3aed' }} />
        ))}

        {/* Rocky terrain silhouette */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 100" preserveAspectRatio="none" style={{ height: '80px' }}>
          <path d={CAVE_TERRAIN} fill="rgba(15,0,35,0.96)" />
          <path d={CAVE_TERRAIN} fill="none" stroke="rgba(124,58,237,0.25)" strokeWidth="1.5" />
        </svg>
        {/* Left/right crack glow lines */}
        <div className="absolute top-0 bottom-0 left-[22%]" style={{ width: '1px', background: 'linear-gradient(to bottom, rgba(124,58,237,0.2), rgba(124,58,237,0.08), transparent 70%)' }} />
        <div className="absolute top-0 bottom-0 left-[68%]" style={{ width: '1px', background: 'linear-gradient(to bottom, rgba(109,40,217,0.18), rgba(109,40,217,0.06), transparent 70%)' }} />
      </div>
    );
  }

  // ── GRASSLAND ───────────────────────────────────────────────────────────────
  if (worldType === 'grassland') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Meadow gradient */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 130%, rgba(5,150,105,0.25) 0%, transparent 55%), radial-gradient(ellipse at 20% 60%, rgba(16,185,129,0.08) 0%, transparent 45%)' }} />
        {/* Breathing green glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 90%, rgba(5,150,105,0.18) 0%, transparent 55%)', animation: 'ambient-breathe 4s ease-in-out infinite' }} />
        {/* Sky canopy */}
        <div className="absolute top-0 left-0 right-0 h-36" style={{ background: 'linear-gradient(to bottom, rgba(2,20,8,0.8) 0%, transparent 100%)' }} />
        {/* Ground warmth */}
        <div className="absolute bottom-0 left-0 right-0 h-44" style={{ background: 'linear-gradient(to top, rgba(5,150,105,0.24) 0%, rgba(16,185,129,0.06) 55%, transparent 100%)' }} />

        {/* Sunray streaks */}
        {[
          { left: '12%', rotate: '22deg', w: '2px', h: '38%', op: 0.07 },
          { left: '48%', rotate: '8deg',  w: '3px', h: '45%', op: 0.05 },
          { left: '78%', rotate: '-18deg',w: '2px', h: '35%', op: 0.06 },
        ].map((r, i) => (
          <div key={i} className="absolute top-0" style={{ left: r.left, width: r.w, height: r.h, background: `linear-gradient(to bottom, rgba(52,211,153,${r.op}), transparent)`, transform: `rotate(${r.rotate})`, transformOrigin: 'top center' }} />
        ))}

        {/* Floating leaves */}
        {GRASSLAND_LEAVES.map((l, i) => (
          <div key={i} className="absolute" style={{ left: l.left, bottom: '-12px', width: i % 3 === 0 ? '10px' : '8px', height: i % 3 === 0 ? '10px' : '8px', borderRadius: '50% 0 50% 0', background: i % 3 === 0 ? 'rgba(52,211,153,0.75)' : i % 3 === 1 ? 'rgba(16,185,129,0.65)' : 'rgba(110,231,183,0.7)', animation: `leaf-float ${l.dur} ease-in-out ${l.delay} infinite`, '--drift': `${l.drift}px`, '--spin': `${l.spin}deg` } as React.CSSProperties} />
        ))}

        {/* Swaying grass blades */}
        {GRASS_BLADES.map((g, i) => (
          <div key={i} className="absolute bottom-[72px]" style={{ left: `${g.left}%`, width: '3px', height: `${g.h}px`, background: `linear-gradient(to top, ${i % 3 === 0 ? '#166534' : i % 3 === 1 ? '#15803d' : '#14532d'}, transparent)`, borderRadius: '2px 2px 0 0', animation: `grass-sway ${g.dur} ease-in-out ${g.delay} infinite`, transformOrigin: 'bottom center' }} />
        ))}

        {/* Grassland terrain silhouette */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 100" preserveAspectRatio="none" style={{ height: '80px' }}>
          <path d={GRASSLAND_TERRAIN} fill="rgba(2,18,6,0.95)" />
          <path d={GRASSLAND_TERRAIN} fill="none" stroke="rgba(5,150,105,0.3)" strokeWidth="1.5" />
        </svg>
        {/* Side vine lines */}
        <div className="absolute top-16 left-0 w-1 h-56" style={{ background: 'linear-gradient(to bottom, rgba(16,185,129,0.45), rgba(5,150,105,0.15), transparent)', borderRadius: '0 5px 5px 0' }} />
        <div className="absolute top-24 right-0 w-1 h-44" style={{ background: 'linear-gradient(to bottom, rgba(16,185,129,0.38), transparent)', borderRadius: '5px 0 0 5px' }} />
      </div>
    );
  }

  // ── VOLCANO ─────────────────────────────────────────────────────────────────
  if (worldType === 'volcano') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Lava floor radiance */}
        <div className="absolute bottom-0 left-0 right-0 h-60" style={{ background: 'linear-gradient(to top, rgba(220,38,38,0.28) 0%, rgba(234,88,12,0.12) 45%, transparent 100%)' }} />
        {/* Breathing heat glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.18) 0%, transparent 60%)', animation: 'ambient-breathe 2.2s ease-in-out infinite' }} />
        {/* Ashy sky */}
        <div className="absolute top-0 left-0 right-0 h-36" style={{ background: 'linear-gradient(to bottom, rgba(38,4,0,0.85) 0%, transparent 100%)' }} />
        {/* Side heat columns */}
        <div className="absolute bottom-0 left-0" style={{ width: '180px', height: '65%', background: 'radial-gradient(ellipse at left bottom, rgba(239,68,68,0.18) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 right-0" style={{ width: '180px', height: '65%', background: 'radial-gradient(ellipse at right bottom, rgba(234,88,12,0.15) 0%, transparent 65%)' }} />

        {/* Ember particles */}
        {EMBERS.map((e, i) => (
          <span key={i} className="absolute rounded-full" style={{ left: e.left, bottom: '-5px', width: `${e.sz}px`, height: `${e.sz}px`, background: i % 2 === 0 ? 'rgba(249,115,22,1)' : 'rgba(239,68,68,0.95)', boxShadow: i % 2 === 0 ? `0 0 ${e.sz * 3}px rgba(249,115,22,0.8)` : `0 0 ${e.sz * 3}px rgba(239,68,68,0.75)`, animation: `ember-rise ${e.dur} ease-out ${e.delay} infinite`, '--drift': `${e.drift}px` } as React.CSSProperties} />
        ))}

        {/* Lava flame tongues at terrain peaks */}
        {LAVA_FLAMES.map((f, i) => (
          <div key={i} className="absolute" style={{ left: f.left, bottom: '72px', width: '10px', height: `${f.h}px`, background: i % 2 === 0 ? 'radial-gradient(ellipse at center 70%, rgba(251,146,60,0.9), rgba(239,68,68,0.7), transparent)' : 'radial-gradient(ellipse at center 70%, rgba(252,165,165,0.8), rgba(249,115,22,0.6), transparent)', borderRadius: '50% 50% 30% 30% / 60% 60% 40% 40%', animation: `flame-dance ${f.dur} ease-in-out ${f.delay} infinite`, transformOrigin: 'bottom center' }} />
        ))}

        {/* Volcanic terrain */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 100" preserveAspectRatio="none" style={{ height: '80px' }}>
          <path d={VOLCANO_TERRAIN} fill="rgba(22,2,0,0.97)" />
          <path d={VOLCANO_TERRAIN} fill="none" stroke="rgba(239,68,68,0.35)" strokeWidth="1.5" />
        </svg>
        {/* Lava crack line */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: '2px', background: 'linear-gradient(to right, transparent, rgba(239,68,68,0.5), rgba(249,115,22,0.65), rgba(239,68,68,0.5), transparent)' }} />
      </div>
    );
  }

  // ── CASTLE ──────────────────────────────────────────────────────────────────
  if (worldType === 'castle') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Royal ambient glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 12% 45%, rgba(217,119,6,0.16) 0%, transparent 48%), radial-gradient(ellipse at 88% 45%, rgba(217,119,6,0.14) 0%, transparent 48%)' }} />
        {/* Breathing torch radiance */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(251,191,36,0.06) 0%, transparent 60%)', animation: 'ambient-breathe 3.5s ease-in-out infinite' }} />
        {/* Stone ceiling */}
        <div className="absolute top-0 left-0 right-0 h-28" style={{ background: 'linear-gradient(to bottom, rgba(28,18,0,0.8) 0%, transparent 100%)', borderBottom: '1px solid rgba(217,119,6,0.08)' }} />
        {/* Floor warmth */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to top, rgba(120,53,15,0.22) 0%, transparent 100%)' }} />

        {/* Wall-mounted torch flames */}
        {TORCH_POSITIONS.map((t, i) => (
          <div key={i} className="absolute" style={{ cssText: t.style } as React.CSSProperties}>
            {/* Torch glow halo */}
            <div className="absolute" style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)', transform: 'translate(-50%, -50%)', top: '50%', left: '50%' }} />
            {/* Flame */}
            <div style={{ width: '14px', height: '28px', background: 'radial-gradient(ellipse at center 70%, rgba(253,224,71,0.95), rgba(249,115,22,0.85), transparent)', borderRadius: '50% 50% 35% 35% / 60% 60% 40% 40%', animation: `flame-dance ${i % 2 === 0 ? '0.38s' : '0.44s'} ease-in-out ${i * 0.09}s infinite`, transformOrigin: 'bottom center' }} />
          </div>
        ))}

        {/* Gold sparkles */}
        {SPARKLES.map((s, i) => (
          <span key={i} className="absolute" style={{ left: s.left, top: s.top, width: '6px', height: '6px', background: i % 2 === 0 ? 'rgba(253,224,71,0.95)' : 'rgba(251,191,36,0.9)', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', animation: `sparkle-appear ${s.dur} ease-in-out ${s.delay} infinite` }} />
        ))}

        {/* Castle battlements terrain */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 100" preserveAspectRatio="none" style={{ height: '80px' }}>
          <path d={CASTLE_TERRAIN} fill="rgba(18,12,0,0.97)" />
          <path d={CASTLE_TERRAIN} fill="none" stroke="rgba(217,119,6,0.3)" strokeWidth="1.5" />
        </svg>
        {/* Gold trim lines */}
        <div className="absolute top-12 left-0 right-0" style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(217,119,6,0.4), rgba(251,191,36,0.5), rgba(217,119,6,0.4), transparent)' }} />
        <div className="absolute bottom-[80px] left-0 right-0" style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(217,119,6,0.3), rgba(217,119,6,0.3), transparent)' }} />
        {/* Stone pillar hints */}
        <div className="absolute top-0 bottom-0 left-[18%]" style={{ width: '1px', background: 'linear-gradient(to bottom, rgba(217,119,6,0.1), rgba(217,119,6,0.06), transparent 70%)' }} />
        <div className="absolute top-0 bottom-0 left-[82%]" style={{ width: '1px', background: 'linear-gradient(to bottom, rgba(217,119,6,0.08), rgba(217,119,6,0.04), transparent 70%)' }} />
      </div>
    );
  }

  return null;
}
