// 本番 URL（OGP の絶対 URL 生成に使用）
// NEXT_PUBLIC_SITE_URL > Vercel 本番ドメイン > ローカル の順で解決する
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const SITE_NAME = 'Modelion';
export const SITE_TAGLINE = 'データエンジニアリングを、設計して体験する。';
export const SITE_DESCRIPTION =
  'SQLを覚えるのではなく、データパイプラインを設計して学ぶ。Source → Staging → Warehouse → Mart をクエスト形式で体験するデータエンジニアリング学習プレイグラウンド。';
export const SITE_HASHTAGS = ['Modelion', 'データエンジニアリング'];
