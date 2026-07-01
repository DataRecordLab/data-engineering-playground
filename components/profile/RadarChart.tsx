'use client';

import type { SkillDimension } from '@/lib/skills/scoring';

interface Props {
  dimensions: SkillDimension[];
  size?: number;
}

const N = 5;
const LEVELS = [0.33, 0.66, 1.0];

function polarToXY(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function angleForAxis(i: number): number {
  // 上から時計回り（-90° スタート）
  return (-Math.PI / 2) + (i * 2 * Math.PI) / N;
}

export function RadarChart({ dimensions, size = 220 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const labelR = size * 0.48;

  // グリッド（3段階）
  const gridPolygons = LEVELS.map(level => {
    const pts = Array.from({ length: N }, (_, i) => {
      const { x, y } = polarToXY(cx, cy, maxR * level, angleForAxis(i));
      return `${x},${y}`;
    }).join(' ');
    return pts;
  });

  // スコアポリゴン
  const scorePoints = dimensions.map((dim, i) => {
    const r = maxR * (dim.score / 100);
    const { x, y } = polarToXY(cx, cy, r, angleForAxis(i));
    return `${x},${y}`;
  }).join(' ');

  // 軸の端点
  const axisEndpoints = Array.from({ length: N }, (_, i) =>
    polarToXY(cx, cy, maxR, angleForAxis(i))
  );

  // ラベル位置
  const labelPositions = Array.from({ length: N }, (_, i) =>
    polarToXY(cx, cy, labelR, angleForAxis(i))
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ overflow: 'visible' }}
    >
      {/* グリッド */}
      {gridPolygons.map((pts, level) => (
        <polygon
          key={level}
          points={pts}
          fill="none"
          stroke="rgba(99,102,241,0.15)"
          strokeWidth={1}
        />
      ))}

      {/* 軸線 */}
      {axisEndpoints.map((end, i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={end.x} y2={end.y}
          stroke="rgba(99,102,241,0.12)"
          strokeWidth={1}
        />
      ))}

      {/* スコアポリゴン */}
      <polygon
        points={scorePoints}
        fill="rgba(129,140,248,0.18)"
        stroke="rgba(129,140,248,0.7)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* スコア頂点の丸 */}
      {dimensions.map((dim, i) => {
        const r = maxR * (dim.score / 100);
        const { x, y } = polarToXY(cx, cy, r, angleForAxis(i));
        return (
          <circle
            key={i}
            cx={x} cy={y} r={3}
            fill={dim.color}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={1}
          />
        );
      })}

      {/* ラベル */}
      {dimensions.map((dim, i) => {
        const { x, y } = labelPositions[i];
        const score = dim.score;
        // テキストアンカー調整
        const anchor = x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle';
        return (
          <g key={i}>
            <text
              x={x} y={y - 4}
              textAnchor={anchor}
              fontSize={9.5}
              fontWeight={600}
              fill="rgba(255,255,255,0.75)"
              fontFamily="system-ui, sans-serif"
            >
              {dim.label}
            </text>
            <text
              x={x} y={y + 8}
              textAnchor={anchor}
              fontSize={8}
              fill={dim.color}
              fontFamily="monospace"
            >
              {score}%
            </text>
          </g>
        );
      })}

      {/* 中心点 */}
      <circle cx={cx} cy={cy} r={2} fill="rgba(129,140,248,0.4)" />
    </svg>
  );
}
