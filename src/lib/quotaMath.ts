/** 每筆追蹤向 Google 查價的間隔（小時）：24 × 筆數 ÷ 每天自動查價上限，介於 1 到 24 小時（前後端共用） */
export function spacingFor(count: number, dailyCap: number): number {
  return Math.min(24, Math.max(1, Math.ceil((24 * Math.max(1, count)) / Math.max(1, dailyCap))));
}
