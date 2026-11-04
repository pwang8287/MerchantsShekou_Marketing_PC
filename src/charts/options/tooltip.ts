import { comparisonChange, comparisonHtml } from '../../utils/comparison';
import { comparableDateRanges, kpiDateRange, selectKpiDateRows } from '../../utils/kpiDaily';
import { calendarBounds, formatStatisticsPeriod } from '../../utils/statisticsPeriod';
import type { EChartsOption } from 'echarts';
import type { DashboardFilter, MarketingPerformanceMetric, Summary } from '../../types';
import {
  filterRows,
  fmt,
  metricDefs,
  previousPeriod,
  shiftPeriod,
  summarize,
} from '../../utils/metrics';
interface Point {
  name: string;
  seriesName: string;
  value: number | number[];
  seriesType: string;
  percent?: number;
  data?: { dealCycle?: number | null };
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const aliases: Record<string, keyof Summary> = {
  营销费用: 'fee',
  单条线索成本: 'fee',
  签约获客成本: 'acquisition',
  营销投入产出比: 'roi',
  去年同期签约: 'amount',
  线索: 'leads',
  到访: 'visits',
  认购: 'subscriptions',
  签约: 'contracts',
};
const fields = [
  'advisor',
  'organization',
  'region',
  'city',
  'project',
  'channel',
  'channelObject',
  'channelDetail',
  'customer',
  'property',
  'area',
] as const;
export function withContext(
  option: EChartsOption,
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  unit: string,
  subtitle: string,
): EChartsOption {
  const original = option.tooltip && !Array.isArray(option.tooltip) ? option.tooltip : {};
  return {
    ...option,
    tooltip: {
      ...original,
      formatter: (input: unknown) => {
        const points = (Array.isArray(input) ? input : [input]) as Point[];
        const first = points[0];
        if (!first) return '';
        const period: [string, string] = /^\d{4}-\d{2}$/.test(first.name)
          ? [first.name, first.name]
          : filter.period;
        const header =
          first.seriesType === 'pie' && original.className === 'dashboard-donut-tooltip'
            ? ''
            : `<b>${escape(first.name)}</b><br/>期间：${period.join(' 至 ')}<br/>`;
        const lines = points.map((p) => {
          const groupName = [p.seriesName, p.name].find((name) =>
            rows.some((r) => fields.some((k) => r[k] === name)),
          );
          const scoped = (range: [string, string]) =>
            filterRows(rows, filter, range).filter(
              (r) => !groupName || fields.some((k) => r[k] === groupName),
            );
          const selectedRange = filter.metricDateRange ? kpiDateRange(filter, 'cumulative') : null;
          const isMonthPoint = /^\d{4}-\d{2}$/.test(first.name);
          const pointBounds = isMonthPoint ? calendarBounds('month', first.name) : null;
          const activeRange =
            selectedRange && pointBounds
              ? {
                  ...selectedRange,
                  start:
                    pointBounds.start > selectedRange.start
                      ? pointBounds.start
                      : selectedRange.start,
                  end: pointBounds.end < selectedRange.end ? pointBounds.end : selectedRange.end,
                }
              : selectedRange;
          const comparisons = activeRange
            ? comparableDateRanges(
                activeRange,
                isMonthPoint ? { ...filter, periodType: 'month' } : filter,
              )
            : null;
          const scopedDate = (range: {
            start: string;
            end: string;
            mode: 'cumulative' | 'yesterday';
          }) =>
            selectKpiDateRows(rows, filter, range).filter(
              (r) => !groupName || fields.some((k) => r[k] === groupName),
            );
          const found = Object.entries(metricDefs).find(
            ([, v]) => p.seriesName === v.label || subtitle.startsWith(v.label),
          );
          const key: keyof Summary =
            aliases[p.seriesName] ||
            aliases[p.name] ||
            (found?.[0] as keyof Summary) ||
            (p.seriesType === 'pie' ? 'leads' : 'amount');
          const def = found?.[1];
          const actualUnit =
            key === 'fee'
              ? '万元'
              : key === 'leads'
                ? '组'
                : key === 'contracts'
                  ? '套'
                  : def?.unit || unit;
          const currentRows = activeRange ? scopedDate(activeRange) : scoped(period),
            priorRows = comparisons
              ? scopedDate(comparisons.prior)
              : scoped(shiftPeriod(period, -12)),
            previousRows = comparisons
              ? scopedDate(comparisons.previous)
              : scoped(previousPeriod(period));
          const current = summarize(currentRows),
            prior = summarize(priorRows),
            previous = summarize(previousRows);
          const percentagePoint = key === 'completion' || key === 'conversion';
          const comparisonUnit = percentagePoint ? 'pct' : '%';
          const comparableValue = (summary: Summary, count: number) => {
            if (
              !count ||
              (key === 'completion' && !summary.target) ||
              (key === 'conversion' && !summary.leads) ||
              (key === 'acquisition' && !summary.contracts) ||
              (key === 'roi' && !summary.fee)
            )
              return null;
            return summary[key];
          };
          const yoy = comparisonChange(
            comparableValue(current, currentRows.length),
            comparableValue(prior, priorRows.length),
            percentagePoint,
          );
          const mom = comparisonChange(
            comparableValue(current, currentRows.length),
            comparableValue(previous, previousRows.length),
            percentagePoint,
          );
          const comparison = `<span style="color:#71809A;font-size:10px">${escape(key === 'fee' ? '营销费用' : Object.entries(metricDefs).find(([k]) => k === key)?.[1].label || '线索量')}同比 ${comparisonHtml(yoy, comparisonUnit)} · 环比 ${comparisonHtml(mom, comparisonUnit)}</span>`;
          if (p.seriesType === 'pie' && original.className === 'dashboard-donut-tooltip') {
            return `<div class="donut-tooltip-title">${escape(p.name)}</div><div class="donut-tooltip-period">${escape(formatStatisticsPeriod(filter))}</div><div class="donut-tooltip-row"><span>客户数量</span><strong>${fmt(Number(p.value))} ${escape(actualUnit)}</strong></div><div class="donut-tooltip-row"><span>占比</span><strong>${p.percent === undefined ? '—' : fmt(p.percent, 1) + '%'}</strong></div><div class="donut-tooltip-row"><span>同比</span>${comparisonHtml(yoy)}</div><div class="donut-tooltip-row"><span>环比</span>${comparisonHtml(mom)}</div>`;
          }
          if (Array.isArray(p.value))
            return `${escape(p.name)}<br/>获客成本：${fmt(p.value[0], 2)} 元/套<br/>签约转化率：${fmt(p.value[1], 1)}%<br/>签约金额：${fmt(p.value[2], 2)} 万元<br/>${p.data?.dealCycle === undefined ? '' : '成交周期（模拟）：' + (p.data.dealCycle === null ? '—' : fmt(p.data.dealCycle, 1) + ' 天') + '<br/>'}${comparison}`;
          return `${escape(p.seriesType === 'pie' || p.seriesType === 'funnel' ? p.name : p.seriesName)}：${fmt(Number(p.value), actualUnit.includes('元') ? 2 : 1)} ${escape(actualUnit)}${p.percent !== undefined ? ' · 占比 ' + p.percent + '%' : ''}<br/>${p.seriesName.includes('去年同期') ? '<span style="color:#71809A;font-size:10px">上年同月基数</span>' : comparison}`;
        });
        return header + lines.join('<br/>');
      },
    },
  };
}
