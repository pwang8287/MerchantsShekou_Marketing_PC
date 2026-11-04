import type { MarketingPerformanceMetric } from '../types';
import { allocateInteger } from '../mocks/allocation';
const fields = [
  'leads',
  'validLeads',
  'visits',
  'visitPeople',
  'subscriptions',
  'subscriptionUnits',
  'subscriptionTargetUnits',
  'contracts',
  'amount',
  'collection',
  'target',
  'fee',
] as const;
const cache = new WeakMap<MarketingPerformanceMetric, Record<string, number[]>>();
function daily(row: MarketingPerformanceMetric, days: number) {
  let result = cache.get(row);
  if (result) return result;
  const seed = [...row.id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 100003, 7);
  const weights = Array.from({ length: days }, (_, i) => 1 + ((seed + i * 7) % 13) / 10);
  result = {};
  for (const key of fields)
    result[key] = allocateInteger(Math.round((row[key] ?? 0) * (key === 'fee' ? 100 : 1)), weights);
  if (row.validLeads !== undefined) {
    const totalLeads = result.leads.reduce((s, n) => s + n, 0);
    result.validLeads = totalLeads
      ? allocateInteger(Math.min(totalLeads, Math.max(0, Math.round(row.validLeads))), result.leads)
      : Array(days).fill(0);
  }
  cache.set(row, result);
  return result;
}
export function sliceDateFacts(rows: MarketingPerformanceMetric[], start: string, end: string) {
  return rows.map((row) => {
    const [year, month] = row.period.split('-').map(Number);
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const from = row.period === start.slice(0, 7) ? Number(start.slice(8)) : 1;
    const to = row.period === end.slice(0, 7) ? Number(end.slice(8)) : days;
    const copy = {
      ...row,
      rangeLabel: `${row.period}-${String(from).padStart(2, '0')} 至 ${row.period}-${String(to).padStart(2, '0')}`,
    };
    if (from === 1 && to === days) return copy;
    const values = daily(row, days);
    for (const key of fields) {
      if (row[key] === undefined) continue;
      copy[key] =
        values[key].slice(from - 1, to).reduce((s, n) => s + n, 0) / (key === 'fee' ? 100 : 1);
    }
    return copy;
  });
}
