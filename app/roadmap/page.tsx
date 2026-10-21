import type { Metadata } from 'next';
import { RoadmapView } from '@/components/roadmap/RoadmapView';

export const metadata: Metadata = {
  title: '学習ロードマップ',
  description:
    'パイプラインの全体像からアーキテクチャ判断まで。Modelion で学べるデータエンジニアリングを Lv1〜5 のカリキュラムで一覧できます。',
};

export default function RoadmapPage() {
  return <RoadmapView />;
}
