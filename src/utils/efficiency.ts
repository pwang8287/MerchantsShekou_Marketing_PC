import type { MarketingEfficiencyMetric, MarketingPerformanceMetric } from '../types';
import { divide, summarize } from './metrics';
export function calculateMarketingEfficiency(
  rows: MarketingPerformanceMetric[],
): MarketingEfficiencyMetric {
  const s = summarize(rows);
  return {
    fee: s.fee,
    feeRate: s.amount ? (s.fee / s.amount) * 100 : null,
    leadCost: divide(s.fee * 10000, s.leads),
    visitCost: divide(s.fee * 10000, s.visits),
    acquisitionCost: s.acquisition,
    roi: s.roi,
  };
}
