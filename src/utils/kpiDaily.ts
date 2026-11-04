import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import { sliceDateFacts } from './dateFacts';
import { filterRows } from './metrics';
import { calendarComparisonRanges } from './statisticsPeriod';
export interface KpiDateRange {
  start: string;
  end: string;
  mode: 'yesterday' | 'cumulative';
}
export const isoDate = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
const date = (value: string) => new Date(value + 'T00:00:00Z');
export function kpiDateRange(filter: DashboardFilter, mode: KpiDateRange['mode']): KpiDateRange {
  const cutoff =
    filter.metricDateRange?.[1] ||
    filter.metricDate ||
    `${filter.period[1]}-${new Date(Date.UTC(Number(filter.period[1].slice(0, 4)), Number(filter.period[1].slice(5)), 0)).getUTCDate()}`;
  if (mode === 'yesterday') {
    const d = date(cutoff);
    d.setUTCDate(d.getUTCDate() - 1);
    return { start: isoDate(d), end: isoDate(d), mode };
  }
  return { start: filter.metricDateRange?.[0] || cutoff.slice(0, 4) + '-01-01', end: cutoff, mode };
}
export function comparableDateRanges(range: KpiDateRange, filter?: DashboardFilter) {
  const calendar = calendarComparisonRanges(range, filter);
  if (calendar) return calendar;
  const shiftYear = (value: string) => {
    const d = date(value);
    const year = d.getUTCFullYear() - 1,
      month = d.getUTCMonth();
    return isoDate(
      new Date(
        Date.UTC(
          year,
          month,
          Math.min(d.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate()),
        ),
      ),
    );
  };
  const length =
    Math.round((date(range.end).getTime() - date(range.start).getTime()) / 86400000) + 1;
  const previousEnd = date(range.start);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - length + 1);
  return {
    prior: { ...range, start: shiftYear(range.start), end: shiftYear(range.end) },
    previous: { ...range, start: isoDate(previousStart), end: isoDate(previousEnd) },
  };
}
export function selectKpiDateRows(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  range: KpiDateRange,
) {
  return sliceDateFacts(
    filterRows(rows, filter, [range.start.slice(0, 7), range.end.slice(0, 7)], false),
    range.start,
    range.end,
  );
}
