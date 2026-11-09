import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import { filterRows } from './metrics';
import { matchesChannel } from './channels';
import { calendarComparisonRanges } from './statisticsPeriod';

export function nationalChannelRows(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  channel: string,
) {
  return filterRows(rows, {
    ...filter,
    organization: '',
    organizationNames: [],
    organizationLabel: '',
    region: '',
    city: '',
    project: '',
    channel: '',
  }).filter((row) => matchesChannel(row.channel, channel));
}

export function comparisonChannelRows(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  channel: string,
  mode: 'yoy' | 'mom',
): MarketingPerformanceMetric[] | null {
  const range = filter.metricDateRange;
  if (!range) return null;
  const ranges = calendarComparisonRanges(
    { start: range[0], end: range[1], mode: 'cumulative' },
    filter,
  );
  if (!ranges) return null;
  const target = mode === 'yoy' ? ranges.prior : ranges.previous;
  return filterRows(rows, {
    ...filter,
    channel: '',
    period: [target.start.slice(0, 7), target.end.slice(0, 7)],
    metricDateRange: [target.start, target.end],
    metricDate: target.end,
  }).filter((row) => matchesChannel(row.channel, channel));
}
