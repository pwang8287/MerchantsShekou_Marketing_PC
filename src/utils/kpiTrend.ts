import type { DashboardFilter, KpiKey, MarketingPerformanceMetric } from '../types';
import { isoDate, kpiDateRange, selectKpiDateRows } from './kpiDaily';
import { summarize } from './metrics';
import { buildEfficiencyTrendData } from './efficiencyTrendData';
import { kpiDefinitions, kpiValue } from './kpiDrilldown';
export interface KpiTrendContext {
  key: KpiKey;
  mode: 'yesterday' | 'cumulative';
  filter: DashboardFilter;
  rows: MarketingPerformanceMetric[];
}
export interface KpiTrendPoint {
  date: string;
  start: string;
  end: string;
  value: number | null;
}
export function buildKpiTrend(context: KpiTrendContext) {
  const { key, mode, rows, filter } = context;
  const selected = kpiDateRange(filter, mode);
  const ranges: { date: string; start: string; end: string }[] = [];
  let grain: 'day' | 'month' | 'quarter' | 'year' = 'day';
  let description = '近30日';
  if (mode === 'yesterday') {
    const end = new Date(selected.end + 'T00:00:00Z');
    for (let i = 29; i >= 0; i--) {
      const day = new Date(end);
      day.setUTCDate(day.getUTCDate() - i);
      const date = isoDate(day);
      ranges.push({ date, start: date, end: date });
    }
  } else {
    const trend = buildEfficiencyTrendData(rows, filter);
    grain =
      filter.periodType === 'quarter' ? 'quarter' : filter.periodType === 'year' ? 'year' : 'month';
    description = trend.description;
    ranges.push(
      ...trend.points.map((point) => ({ date: point.label, start: point.start, end: point.end })),
    );
  }

  function value(start: string, end: string) {
    const facts = selectKpiDateRows(rows, filter, { start, end, mode });
    if (
      !facts.length ||
      ((key === 'visitPeople' || key === 'subscriptionUnits') &&
        facts.some((r) => r[key] === undefined))
    )
      return null;
    return kpiValue(summarize(facts), key);
  }
  const points: KpiTrendPoint[] = ranges.map((range) => ({
    ...range,
    value: value(range.start, range.end),
  }));
  return {
    ...kpiDefinitions[key],
    mode,
    grain,
    description,
    points,
    start: ranges[0]?.start || selected.start,
    end: selected.end,
    selectedStart: selected.start,
    total: value(selected.start, selected.end),
    latest: points[points.length - 1]?.value ?? null,
  };
}
