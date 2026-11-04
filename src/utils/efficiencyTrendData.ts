import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import { calendarBounds, periodAnchor } from './statisticsPeriod';
import { kpiDateRange, selectKpiDateRows } from './kpiDaily';
import { shiftPeriod, summarize } from './metrics';
export interface EfficiencyTrendBucket {
  label: string;
  start: string;
  end: string;
  fee: number | null;
  roi: number | null;
  records: MarketingPerformanceMetric[];
}
export function buildEfficiencyTrendData(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
) {
  const selected = kpiDateRange(filter, 'cumulative');
  const type = filter.periodType || 'custom';
  const calendarType = type === 'custom' ? 'month' : type;
  const final = calendarBounds(calendarType, periodAnchor(calendarType, selected.end));
  const firstMonth = type === 'custom' ? selected.start.slice(0, 7) : final.start.slice(0, 7);
  const lastMonth = selected.end.slice(0, 7);
  const customCount =
    (Number(lastMonth.slice(0, 4)) - Number(firstMonth.slice(0, 4))) * 12 +
    Number(lastMonth.slice(5)) -
    Number(firstMonth.slice(5)) +
    1;
  const count = type === 'quarter' ? 4 : type === 'year' ? 3 : type === 'month' ? 12 : customCount;
  const step = type === 'quarter' ? 3 : type === 'year' ? 12 : 1;
  const points: EfficiencyTrendBucket[] = Array.from({ length: count }, (_, i) => {
    const month = shiftPeriod(
      [firstMonth, firstMonth],
      type === 'custom' ? i : (i - count + 1) * step,
    )[0];
    const anchor = periodAnchor(calendarType, month + '-01');
    const bounds = calendarBounds(calendarType, anchor);
    const start = type === 'custom' && i === 0 ? selected.start : bounds.start;
    const end = i === count - 1 ? selected.end : bounds.end;
    const records = selectKpiDateRows(rows, filter, { start, end, mode: 'cumulative' });
    const s = summarize(records);
    return {
      label:
        calendarType === 'quarter'
          ? anchor.replace('-Q', '年Q')
          : calendarType === 'year'
            ? anchor + '年'
            : month,
      start,
      end,
      records,
      fee: records.length ? s.fee : null,
      roi: records.length && s.fee ? s.amount / s.fee : null,
    };
  });
  const start = points[0]?.start || selected.start;
  const end = points[points.length - 1]?.end || selected.end;
  const trendFilter: DashboardFilter = {
    ...filter,
    periodType: 'custom',
    period: [start.slice(0, 7), end.slice(0, 7)],
    metricDateRange: [start, end],
    metricDate: end,
  };
  return {
    points,
    filter: trendFilter,
    description:
      type === 'month'
        ? '近12个月'
        : type === 'quarter'
          ? '近4个季度'
          : type === 'year'
            ? '近3年'
            : '所选周期内自然月',
    start,
    end,
  };
}
