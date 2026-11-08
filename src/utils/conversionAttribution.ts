import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import { filterRows, summarize } from './metrics';
import {
  calendarBounds,
  calendarComparisonRanges,
  formatStatisticsPeriod,
  periodAnchor,
} from './statisticsPeriod';
import organizationTree from '../mocks/organizationTree.json';
export type ConversionStageKey = 'leads' | 'visitPeople' | 'subscriptionUnits' | 'contracts';
export type AttributionDimension = 'channel' | 'group' | 'organization' | 'project';
export type AttributionComparison = 'yoy' | 'mom';
export function conversionAttribution(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  key: ConversionStageKey,
  dimension: AttributionDimension,
  comparisonMode: AttributionComparison = 'mom',
) {
  const start = filter.metricDateRange?.[0] || filter.period[0] + '-01';
  const end =
    filter.metricDateRange?.[1] ||
    filter.metricDate ||
    calendarBounds('month', filter.period[1]).end;
  const comparison = calendarComparisonRanges({ start, end, mode: 'cumulative' }, filter);
  const iso = (value: number) => new Date(value).toISOString().slice(0, 10);
  const duration = Date.parse(end) - Date.parse(start) + 86400000;
  const lastYear = (value: string) => {
    const date = new Date(value + 'T00:00:00Z');
    const year = date.getUTCFullYear() - 1;
    const month = date.getUTCMonth();
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return iso(Date.UTC(year, month, Math.min(date.getUTCDate(), last)));
  };
  const previous =
    comparisonMode === 'yoy'
      ? comparison?.prior || { start: lastYear(start), end: lastYear(end) }
      : comparison?.previous || {
          start: iso(Date.parse(start) - duration),
          end: iso(Date.parse(start) - 86400000),
        };
  const type = filter.periodType || 'custom';
  const previousFilter: DashboardFilter = {
    ...filter,
    periodAnchor: type === 'custom' ? undefined : periodAnchor(type, previous.start),
    period: [previous.start.slice(0, 7), previous.end.slice(0, 7)],
    metricDate: previous.end,
    metricDateRange: [previous.start, previous.end],
  };
  const currentRows = filterRows(rows, filter),
    previousRows = filterRows(rows, previousFilter);
  const groups = new Map<
    string,
    { name: string; current: number; previous: number; delta: number }
  >();
  const nameFor = (row: MarketingPerformanceMetric) =>
    dimension === 'group'
      ? organizationTree.children.find((group) => group.children.includes(row.organization))
          ?.name || row.region
      : row[dimension];
  for (const [periodRows, field] of [
    [currentRows, 'current'],
    [previousRows, 'previous'],
  ] as const) {
    for (const row of periodRows) {
      const name = nameFor(row);
      if (!groups.has(name)) groups.set(name, { name, current: 0, previous: 0, delta: 0 });
      groups.get(name)![field] += row[key] ?? 0;
    }
  }
  const items = [...groups.values()]
    .map((item) => ({ ...item, delta: item.current - item.previous }))
    .sort((a, b) => b.delta - a.delta);
  const current = summarize(currentRows)[key],
    prior = summarize(previousRows)[key];
  return {
    current,
    previous: prior,
    delta: current - prior,
    rate: prior ? ((current - prior) / prior) * 100 : null,
    currentLabel: formatStatisticsPeriod(filter),
    previousLabel: formatStatisticsPeriod(previousFilter),
    items,
  };
}
