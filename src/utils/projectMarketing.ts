import type { DashboardFilter, MarketingPerformanceMetric, Summary } from '../types';
import { comparableDateRanges, kpiDateRange, selectKpiDateRows } from './kpiDaily';
import { groupRows, summarize } from './metrics';

export const marketingStages = [
  { key: 'leads', label: '获客', unit: '组', color: '#4c88ff' },
  { key: 'visits', label: '到访', unit: '组', color: '#27afc3' },
  { key: 'subscriptions', label: '认购', unit: '组', color: '#8276e9' },
  { key: 'contracts', label: '签约', unit: '套', color: '#ae82da' },
] as const;
export function stageRate(s: Summary, index: number): number | null {
  if (!index) return s.leads ? (s.validLeads / s.leads) * 100 : null;
  const denominator = s[marketingStages[index - 1].key];
  return denominator ? (s[marketingStages[index].key] / denominator) * 100 : null;
}
export function projectMarketing(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  project: string,
) {
  const identity = rows.find((r) => r.project === project);
  const base: DashboardFilter = {
    ...filter,
    organization: '',
    organizationNames: [],
    region: '',
    city: '',
    project: '',
  };
  const range = kpiDateRange(filter, 'cumulative');
  const dates = comparableDateRanges(range, filter);
  const headquarters = selectKpiDateRows(rows, base, range);
  const current = headquarters.filter((r) => r.project === project);
  const comparison = (scope: MarketingPerformanceMetric[]) => {
    const groups = groupRows(scope, 'project');
    return { summary: summarize(scope), projects: groups.length };
  };
  return {
    identity,
    range,
    dates,
    base,
    current,
    summary: summarize(current),
    prior: summarize(selectKpiDateRows(rows, { ...base, project }, dates.prior)),
    previous: summarize(selectKpiDateRows(rows, { ...base, project }, dates.previous)),
    headquarters: comparison(headquarters),
    city: comparison(headquarters.filter((r) => r.city === identity?.city)),
  };
}
