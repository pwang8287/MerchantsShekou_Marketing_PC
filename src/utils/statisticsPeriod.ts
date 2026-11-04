import type { DashboardFilter, StatisticsPeriodType } from '../types';
const iso = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
export const machineDate = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
export function periodAnchor(type: StatisticsPeriodType, date: string) {
  if (type === 'year') return date.slice(0, 4);
  if (type === 'quarter')
    return `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
  return date.slice(0, 7);
}
export function formatStatisticsPeriod(filter: DashboardFilter): string {
  const type = filter.periodType || 'custom';
  const range = filter.metricDateRange || [
    `${filter.period[0]}-01`,
    calendarBounds('month', filter.period[1]).end,
  ];
  if (type === 'custom') {
    const formatDate = (date: string) => date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日');
    return `${formatDate(range[0])} - ${formatDate(range[1])}`;
  }
  const anchor = filter.periodAnchor || periodAnchor(type, range[1]);
  if (type === 'year') return `${anchor.slice(0, 4)}年`;
  if (type === 'quarter') return `${anchor.slice(0, 4)}年Q${anchor.slice(-1)}`;
  return `${anchor.slice(0, 4)}年${anchor.slice(5, 7)}月`;
}
export function calendarBounds(type: Exclude<StatisticsPeriodType, 'custom'>, anchor: string) {
  const year = Number(anchor.slice(0, 4));
  const month =
    type === 'year'
      ? 1
      : type === 'quarter'
        ? (Number(anchor.slice(-1)) - 1) * 3 + 1
        : Number(anchor.slice(5, 7));
  const count = type === 'year' ? 12 : type === 'quarter' ? 3 : 1;
  return {
    start: iso(new Date(Date.UTC(year, month - 1, 1))),
    end: iso(new Date(Date.UTC(year, month - 1 + count, 0))),
  };
}
export function resolveStatisticsPeriod(
  filter: DashboardFilter,
  now = new Date(),
): DashboardFilter {
  const type = filter.periodType || 'custom';
  const today = machineDate(now);
  let range = filter.metricDateRange;
  if (type !== 'custom') {
    const anchor = filter.periodAnchor || periodAnchor(type, filter.metricDateRange?.[1] || today);
    const bounds = calendarBounds(type, anchor);
    range = [bounds.start, today >= bounds.start && today <= bounds.end ? today : bounds.end];
  }
  if (!range) return { ...filter };
  return {
    ...filter,
    periodType: type,
    metricDateRange: [...range],
    metricDate: range[1],
    period: [range[0].slice(0, 7), range[1].slice(0, 7)],
  };
}
export function statisticsPeriodPrefix(type?: StatisticsPeriodType) {
  return type === 'month'
    ? '月度'
    : type === 'quarter'
      ? '季度'
      : type === 'year'
        ? '年度'
        : '累计';
}
export function calendarComparisonRanges(
  range: { start: string; end: string; mode: 'yesterday' | 'cumulative' },
  filter?: DashboardFilter,
) {
  const type = filter?.periodType;
  if (!type || type === 'custom' || range.mode !== 'cumulative') return null;
  const bounds = calendarBounds(type, periodAnchor(type, range.start));
  if (range.start !== bounds.start || range.end > bounds.end || range.end < range.start)
    return null;
  const whole = range.end === bounds.end;
  const shifted = (months: number) => {
    const start = new Date(range.start + 'T00:00:00Z');
    const anchor = iso(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1)));
    const target = calendarBounds(type, periodAnchor(type, anchor));
    const d = new Date(range.end + 'T00:00:00Z');
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
    const last = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
    return {
      ...range,
      start: target.start,
      end: whole
        ? target.end
        : iso(
            new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), Math.min(d.getUTCDate(), last))),
          ),
    };
  };
  return {
    prior: shifted(-12),
    previous: shifted(type === 'month' ? -1 : type === 'quarter' ? -3 : -12),
  };
}
