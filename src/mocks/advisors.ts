import { allocateInteger as allocate } from './allocation';
import type { MarketingPerformanceMetric } from '../types';
// 虚构顾问：每项目4人。按项目月度业绩分配，所有加总与原始记录一致。
export function splitAdvisorRecords(
  rows: MarketingPerformanceMetric[],
): MarketingPerformanceMetric[] {
  const names = [...new Set(rows.map((r) => r.project))].sort();
  return rows.flatMap((r) => {
    const pi = names.indexOf(r.project);
    const year = Number(r.period.slice(0, 4));
    const month = Number(r.period.slice(5));
    const seed = (pi * 3 + month) % 4;
    const sales = Array.from(
      { length: 4 },
      (_, i) => 1 + ((i + seed) % 4) * 0.35 + (year === 2026 ? [0.9, -0.3, 0.3, -0.2][i] : 0),
    );
    const traffic = Array.from(
      { length: 4 },
      (_, i) => 1 + ((i + seed) % 4) * 0.25 + (year === 2026 ? [-0.1, 0.8, 0.4, 0.1][i] : 0),
    );
    const contracts = allocate(r.contracts, sales),
      extraSubs = allocate(r.subscriptions - r.contracts, traffic),
      extraVisits = allocate(r.visits - r.subscriptions, traffic),
      extraLeads = allocate(r.leads - r.visits, traffic);
    const subs = contracts.map((v, i) => v + extraSubs[i]);
    const visits = subs.map((v, i) => v + extraVisits[i]);
    const leads = visits.map((v, i) => v + extraLeads[i]);
    const moneyWeights = contracts.some(Boolean) ? contracts : sales;
    const amount = allocate(r.amount, moneyWeights),
      collection = allocate(r.collection, moneyWeights),
      target = allocate(r.target, traffic),
      fee = allocate(Math.round(r.fee * 100), leads.some(Boolean) ? leads : traffic);
    return sales.map((_, i) => ({
      ...r,
      id: r.id + '-a' + i,
      advisorId: `advisor-${pi}-${i}`,
      advisor: `顾问${String(pi * 4 + i + 1).padStart(2, '0')}`,
      contracts: contracts[i],
      subscriptions: subs[i],
      visits: visits[i],
      leads: leads[i],
      amount: amount[i],
      collection: collection[i],
      target: target[i],
      fee: fee[i] / 100,
    }));
  });
}
