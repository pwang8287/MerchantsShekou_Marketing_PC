import type { MarketingPerformanceMetric } from '../types';
export type BubbleSizeMetric = 'current' | 'cycle';
// 演示口径：客户首次留资至签约的天数。以原始触点生成稳定周期，按签约套数加权。
// 当前无客户级日期；此处为模拟值，不代表真实客户成交耗时。
export function simulatedDealCycle(rows: MarketingPerformanceMetric[]) {
  let days = 0,
    contracts = 0;
  for (const row of rows) {
    const key = [row.project, row.period, row.channelDetailId, row.customer].join('|');
    const seed = [...key].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) % 100003, 7);
    const duration = 12 + (seed % 79);
    days += duration * row.contracts;
    contracts += row.contracts;
  }
  return contracts ? days / contracts : null;
}
