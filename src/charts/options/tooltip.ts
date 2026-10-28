import type { EChartsOption } from 'echarts';
import type { DashboardFilter, MarketingPerformanceMetric, Summary } from '../../types';
import {
  change,
  filterRows,
  fmt,
  metricDefs,
  previousPeriod,
  shiftPeriod,
  summarize,
  trendLabel,
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
          const current = summarize(scoped(period)),
            prior = summarize(scoped(shiftPeriod(period, -12))),
            previous = summarize(scoped(previousPeriod(period)));
          const comparison = `<span style="color:#71809A;font-size:10px">${escape(key === 'fee' ? '营销费用' : Object.entries(metricDefs).find(([k]) => k === key)?.[1].label || '线索量')}同比 ${trendLabel(change(current[key], prior[key]))} · 环比 ${trendLabel(change(current[key], previous[key]))}</span>`;
          if (p.seriesType === 'pie' && original.className === 'dashboard-donut-tooltip') {
            const yoy = change(current[key], prior[key]),
              mom = change(current[key], previous[key]);
            const trendClass = (value: number) =>
              !Number.isFinite(value) || value === 0
                ? 'neutral'
                : value > 0
                  ? 'positive'
                  : 'negative';
            return `<div class="donut-tooltip-title">${escape(p.name)}</div><div class="donut-tooltip-period">${period.join(' 至 ')}</div><div class="donut-tooltip-row"><span>客户数量</span><strong>${fmt(Number(p.value))} ${escape(actualUnit)}</strong></div><div class="donut-tooltip-row"><span>占比</span><strong>${p.percent === undefined ? '—' : fmt(p.percent, 1) + '%'}</strong></div><div class="donut-tooltip-row"><span>同比</span><strong class="${trendClass(yoy)}">${trendLabel(yoy)}</strong></div><div class="donut-tooltip-row"><span>环比</span><strong class="${trendClass(mom)}">${trendLabel(mom)}</strong></div>`;
          }
          if (Array.isArray(p.value))
            return `${escape(p.name)}<br/>获客成本：${fmt(p.value[0])} 元/套<br/>签约转化率：${fmt(p.value[1], 1)}%<br/>签约金额：${fmt(p.value[2])} 万元<br/>${p.data?.dealCycle === undefined ? '' : '成交周期（模拟）：' + (p.data.dealCycle === null ? '—' : fmt(p.data.dealCycle, 1) + ' 天') + '<br/>'}${comparison}`;
          return `${escape(p.seriesType === 'pie' || p.seriesType === 'funnel' ? p.name : p.seriesName)}：${fmt(Number(p.value), 1)} ${escape(actualUnit)}${p.percent !== undefined ? ' · 占比 ' + p.percent + '%' : ''}<br/>${p.seriesName.includes('去年同期') ? '<span style="color:#71809A;font-size:10px">上年同月基数</span>' : comparison}`;
        });
        return header + lines.join('<br/>');
      },
    },
  };
}
