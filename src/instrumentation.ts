/** Next.js 伺服器啟動時執行一次：啟動內建排程（價格檢查）與 Telegram 輪詢 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler');
    startScheduler();
  }
}
