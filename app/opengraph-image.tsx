import { renderOgCard, OG_SIZE } from '@/lib/og/card';

export const alt = 'Modelion — データエンジニアリングを、設計して体験する。';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderOgCard({
    eyebrow: 'DATA ENGINEERING PLAYGROUND',
    title: 'パイプラインを設計して学ぶ',
    subtitle: 'SQLの暗記ではなく、データ基盤の「なぜ」をクエストで体験する。',
  });
}
