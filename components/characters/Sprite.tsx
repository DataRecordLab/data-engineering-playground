'use client';
import type { PixelGrid } from './sprites';

interface SpriteProps {
  grid: PixelGrid;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Sprite({ grid, scale = 4, className, style }: SpriteProps) {
  const size = 16 * scale;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ imageRendering: 'pixelated', ...style }}
      className={className}
      aria-hidden
    >
      {grid.map((row, y) =>
        row.map((color, x) =>
          color ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
          ) : null
        )
      )}
    </svg>
  );
}
