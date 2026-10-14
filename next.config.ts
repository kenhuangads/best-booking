import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 原生 / 需要在執行期載入的套件，不交給 bundler 打包
  serverExternalPackages: ['better-sqlite3', '@libsql/client'],
  // 自架（Docker / Zeabur / Railway）時產出 standalone；Vercel 不需要
  output: process.env.VERCEL ? undefined : 'standalone',
};

export default nextConfig;
