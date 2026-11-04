import { allocateInteger as allocate } from './allocation';
import type { MarketingPerformanceMetric } from '../types';
const profileSeed = (key: string) => {
  let seed = 2166136261;
  for (const char of key) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return (seed ^ (seed >>> 16)) >>> 0;
};
// 虚构顾问：每项目4人。按项目月度业绩分配，所有加总与原始记录一致。
export function splitAdvisorRecords(
  rows: MarketingPerformanceMetric[],
  projectNames?: string[],
): MarketingPerformanceMetric[] {
  const names = projectNames || [...new Set(rows.map((r) => r.project))].sort();
  return rows.flatMap((r) => {
    const pi = names.indexOf(r.project);
    const year = Number(r.period.slice(0, 4));
    const month = Number(r.period.slice(5));
    const seed = (pi * 3 + month) % 4;
    // 各项目顾问拥有不同的接待/成交倾向，触点与月份再叠加稳定差异，
    // 避免循环使用同一组权重导致不同顾问落在完全相同的坐标。
    const touchpoint = [r.project, r.period, r.channelDetailId, r.customer].join('|');
    const profile = (i: number, metric: string) =>
      (0.85 + (profileSeed(`${r.project}|${i}|${metric}`) % 41) / 100) *
      (0.35 + (profileSeed(`${touchpoint}|${i}|${metric}`) % 131) / 100);
    const sales = Array.from(
      { length: 4 },
      (_, i) =>
        (1 + ((i + seed) % 4) * 0.35 + (year === 2026 ? [0.9, -0.3, 0.3, -0.2][i] : 0)) *
        profile(i, 'sales'),
    );
    const traffic = Array.from(
      { length: 4 },
      (_, i) =>
        (1 + ((i + seed) % 4) * 0.25 + (year === 2026 ? [-0.1, 0.8, 0.4, 0.1][i] : 0)) *
        profile(i, 'traffic'),
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
      subscriptionTargetUnits:
        r.subscriptionTargetUnits === undefined
          ? undefined
          : allocate(r.subscriptionTargetUnits, traffic)[i],
      subscriptions: subs[i],
      visits: visits[i],
      visitPeople:
        r.visitPeople === undefined
          ? undefined
          : allocate(r.visitPeople, visits.some(Boolean) ? visits : traffic)[i],
      subscriptionUnits:
        r.subscriptionUnits === undefined
          ? undefined
          : allocate(r.subscriptionUnits, subs.some(Boolean) ? subs : sales)[i],
      leads: leads[i],
      validLeads:
        r.validLeads === undefined
          ? undefined
          : allocate(r.validLeads, leads.some(Boolean) ? leads : traffic)[i],
      amount: amount[i],
      collection: collection[i],
      target: target[i],
      fee: fee[i] / 100,
    }));
  });
}
