import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

export const OG_SIZE = { width: 1200, height: 630 };

const LAYERS = ['Source', 'Staging', 'Warehouse', 'Mart'];

interface OgCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  stars?: number;
  accent?: string;
  headers?: Record<string, string>;
}

// 日本語グリフを描画するため、使う文字だけを Google Fonts からサブセット取得する
// 取得に失敗してもカード生成自体は止めない（フォントなしで描画）
async function loadJapaneseFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@800&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl)).text();
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!fontUrl) return null;
    const res = await fetch(fontUrl);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function renderOgCard({ eyebrow, title, subtitle, stars, accent = '#818CF8', headers }: OgCardProps) {
  const starLine = stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
  const font = await loadJapaneseFont([SITE_NAME, SITE_TAGLINE, eyebrow, title, subtitle ?? '', starLine, 'M', ...LAYERS].join(''));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #080918 0%, #0c0c28 55%, #140a2a 100%)',
          color: '#F8FAFC',
          fontFamily: font ? 'NotoSansJP' : undefined,
        }}
      >
        {/* ヘッダー：ブランド */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              color: '#080918',
            }}
          >
            M
          </div>
          <div style={{ fontSize: 34, letterSpacing: 1 }}>{SITE_NAME}</div>
        </div>

        {/* 本文 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 26, color: accent, letterSpacing: 3 }}>{eyebrow}</div>
          <div style={{ fontSize: title.length > 16 ? 64 : 80, lineHeight: 1.15 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 30, color: '#94A3B8', lineHeight: 1.4, maxWidth: 1000 }}>{subtitle}</div>
          )}
          {starLine && <div style={{ fontSize: 64, color: '#FBBF24', letterSpacing: 8 }}>{starLine}</div>}
        </div>

        {/* フッター：タグライン */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px solid rgba(148,163,184,0.18)',
            paddingTop: 24,
            fontSize: 26,
            color: '#CBD5E1',
          }}
        >
          <div>{SITE_TAGLINE}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {LAYERS.map((layer, i) => (
              <div
                key={layer}
                style={{
                  fontSize: 18,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `2px solid ${accent}`,
                  opacity: 0.4 + i * 0.2,
                }}
              >
                {layer}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      headers,
      fonts: font ? [{ name: 'NotoSansJP', data: font, weight: 800, style: 'normal' }] : undefined,
    }
  );
}
