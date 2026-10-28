import { simulatedDealCycle } from '../../utils/dealCycle';
import type { BubbleSizeMetric } from '../../utils/dealCycle';
import { donutTooltip } from './donutTooltip';
import type { EChartsOption } from 'echarts';
import type { AggregateRow, MarketingPerformanceMetric, MetricKey } from '../../types';
import { axis, palette } from '../themes/default';
import { fmt, groupRows, metricDefs, summarize } from '../../utils/metrics';
function tooltip(unit: string) {
  return {
    trigger: 'axis' as const,
    backgroundColor: '#fff',
    borderColor: '#E2E8F0',
    textStyle: { color: '#14243D', fontSize: 12 },
    valueFormatter: (value: unknown) => `${fmt(Number(value), 1)} ${unit}`,
    extraCssText: 'box-shadow:0 5px 24px #10233f14;border-radius:6px;',
  };
}
const grid = { left: 45, right: 18, top: 36, bottom: 26, containLabel: false };
export function trendOption(
  rows: MarketingPerformanceMetric[],
  previous: MarketingPerformanceMetric[],
): EChartsOption {
  const data = groupRows(rows, 'period').sort((a, b) => a.name.localeCompare(b.name));
  const prior = groupRows(previous, 'period');
  return {
    color: palette,
    tooltip: tooltip('万元'),
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 6,
      textStyle: { color: '#71809A', fontSize: 11 },
    },
    grid,
    xAxis: {
      type: 'category',
      data: data.map((r) => r.name),
      ...axis,
      boundaryGap: false,
    },
    yAxis: [
      { type: 'value', ...axis, name: '万元', nameTextStyle: { fontSize: 10, color: '#71809A' } },
      {
        type: 'value',
        ...axis,
        name: '套',
        splitLine: { show: false },
        nameTextStyle: { fontSize: 10, color: '#71809A' },
      },
    ],
    series: [
      {
        name: '签约金额',
        type: 'line',
        smooth: true,
        symbolSize: 5,
        lineStyle: { width: 3 },
        areaStyle: { color: '#2873ED', opacity: 0.06 },
        data: data.map((r) => r.amount),
      },
      {
        name: '回款金额',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2 },
        data: data.map((r) => r.collection),
      },
      {
        name: '去年同期签约',
        type: 'line',
        symbol: 'none',
        lineStyle: { type: 'dashed', width: 1.5 },
        data: data.map(
          (r) =>
            prior.find((p) => p.name === `${Number(r.name.slice(0, 4)) - 1}${r.name.slice(4)}`)
              ?.amount ?? null,
        ),
      },
      {
        name: '签约套数',
        type: 'line',
        yAxisIndex: 1,
        symbol: 'none',
        lineStyle: { width: 1.5 },
        tooltip: { valueFormatter: (v: unknown) => `${v} 套` },
        data: data.map((r) => r.contracts),
      },
    ],
  };
}
export function barOption(groups: AggregateRow[], key: MetricKey = 'amount'): EChartsOption {
  const data = [...groups]
    .sort((a, b) => b[key] - a[key])
    .slice(0, 8)
    .reverse();
  const def = metricDefs[key];
  return {
    color: palette,
    tooltip: tooltip(def.unit),
    grid: { left: 125, right: 55, top: 8, bottom: 18 },
    xAxis: { type: 'value', ...axis },
    yAxis: {
      type: 'category',
      data: data.map((r) => r.name),
      ...axis,
      axisLabel: { color: '#71809A', fontSize: 11, width: 115, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        name: def.label,
        barWidth: 12,
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: '#71809A',
          formatter: (p) => fmt(Number(p.value)),
        },
        data: data.map((r) => ({ value: r[key], name: r.name })),
      },
    ],
  };
}
export function funnelOption(rows: MarketingPerformanceMetric[]): EChartsOption {
  const s = summarize(rows);
  const values = [s.leads, s.visits, s.subscriptions, s.contracts];
  return {
    color: ['#2873ED', '#528FF0', '#7CAAF4', '#A5C6F8'],
    tooltip: { trigger: 'item', formatter: '{b}：{c} 组 / 套' },
    series: [
      {
        type: 'funnel',
        left: '8%',
        top: 8,
        bottom: 8,
        width: '75%',
        minSize: '24%',
        maxSize: '100%',
        gap: 6,
        label: {
          show: true,
          position: 'inside',
          formatter: (p) => `${p.name}  ${fmt(Number(p.value))}`,
          fontSize: 12,
        },
        data: ['线索', '到访', '认购', '签约'].map((name, i) => ({ name, value: values[i] })),
      },
    ],
  };
}
export function efficiencyOption(rows: MarketingPerformanceMetric[]): EChartsOption {
  const groups = groupRows(rows, 'channel');
  return {
    color: palette,
    tooltip: tooltip('元'),
    legend: { top: 0, right: 0, textStyle: { fontSize: 11 } },
    grid: { ...grid, left: 50 },
    xAxis: { type: 'category', data: groups.map((r) => r.name), ...axis },
    yAxis: { type: 'value', ...axis, name: '元/套', nameTextStyle: { fontSize: 10 } },
    series: [
      {
        name: '签约获客成本',
        type: 'bar',
        barWidth: 22,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
        data: groups.map((r) => Math.round(r.acquisition)),
      },
    ],
  };
}
export function efficiencyTrend(rows: MarketingPerformanceMetric[]): EChartsOption {
  const groups = groupRows(rows, 'period');
  return {
    color: palette,
    tooltip: tooltip('万元'),
    grid,
    legend: { top: 0, right: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', ...axis, data: groups.map((r) => r.name) },
    yAxis: [
      { type: 'value', ...axis, name: '万元', nameTextStyle: { fontSize: 10 } },
      {
        type: 'value',
        ...axis,
        name: '倍',
        splitLine: { show: false },
        nameTextStyle: { fontSize: 10 },
      },
    ],
    series: [
      { name: '营销费用', type: 'bar', barWidth: 16, data: groups.map((r) => Math.round(r.fee)) },
      {
        name: '营销投入产出比',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        tooltip: { valueFormatter: (v: unknown) => `${v} 倍` },
        data: groups.map((r) => Math.round(r.roi)),
      },
    ],
  };
}
export function donutOption(
  groups: AggregateRow[],
  {
    showLegend = true,
    colorForName,
  }: { showLegend?: boolean; colorForName?: (name: string) => string } = {},
): EChartsOption {
  return {
    color: colorForName ? groups.map((r) => colorForName(r.name)) : palette,
    tooltip: donutTooltip(),
    legend: {
      show: showLegend,
      orient: 'vertical',
      right: 12,
      top: 'middle',
      icon: 'circle',
      itemWidth: 7,
      itemHeight: 7,
      textStyle: { fontSize: 11, color: '#71809A' },
    },
    graphic: [
      {
        type: 'text',
        left: showLegend ? '27%' : 'center',
        top: showLegend ? '43%' : 'middle',
        style: { text: '客户结构', fontSize: 13, fill: '#14243D' },
      },
    ],
    series: [
      {
        type: 'pie',
        center: [showLegend ? '38%' : '50%', '50%'],
        radius: [48, 74],
        label: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 3 },
        data: groups.map((r) => ({
          name: r.name,
          value: r.leads,
          ...(colorForName ? { itemStyle: { color: colorForName(r.name) } } : {}),
        })),
      },
    ],
  };
}
export function scatterOption(
  groups: AggregateRow[],
  sizeMetric: BubbleSizeMetric = 'current',
): EChartsOption {
  const cycle = (r: AggregateRow) => simulatedDealCycle(r.records);
  const size = (r: AggregateRow) => (sizeMetric === 'cycle' ? (cycle(r) ?? 0) : r.amount);
  const max = Math.max(...groups.map(size), 1);
  return {
    color: palette,
    tooltip: {
      trigger: 'item',
      formatter: (p: unknown) => {
        const d = (p as { data: { name: string; value: number[] } }).data;
        return `${d.name}<br/>获客成本：${fmt(d.value[0])} 元/套<br/>签约转化率：${fmt(d.value[1], 1)}%<br/>签约金额：${fmt(d.value[2])} 万元`;
      },
    },
    grid: { left: 48, right: 26, top: 28, bottom: 32 },
    xAxis: { type: 'value', name: '元/套', ...axis, nameTextStyle: { fontSize: 10 } },
    yAxis: { type: 'value', name: '转化率 %', ...axis, nameTextStyle: { fontSize: 10 } },
    series: groups.map((r, i) => ({
      name: r.name,
      type: 'scatter',
      symbolSize: size(r) ? 18 + Math.sqrt(size(r) / max) * 30 : 0,
      itemStyle: { color: palette[i % palette.length], opacity: 0.8 },
      data: [
        {
          name: r.name,
          value: [Math.round(r.acquisition), Number(r.conversion.toFixed(2)), r.amount],
          dealCycle: cycle(r),
        },
      ],
    })),
  };
}
export function comparisonTrend(
  rows: MarketingPerformanceMetric[],
  dimension: 'region' | 'channel' | 'project',
  key: MetricKey,
  previous: MarketingPerformanceMetric[] = [],
): EChartsOption {
  const groups = groupRows(rows, dimension).slice(0, 5),
    periods = [...new Set(rows.map((r) => r.period))].sort();
  return {
    color: palette,
    tooltip: tooltip(metricDefs[key].unit),
    legend: { top: 0, type: 'scroll', textStyle: { fontSize: 10 } },
    grid,
    xAxis: { type: 'category', ...axis, data: periods },
    yAxis: { type: 'value', ...axis, name: metricDefs[key].unit, nameTextStyle: { fontSize: 10 } },
    series: groups.flatMap((r) => [
      {
        name: r.name,
        type: 'line' as const,
        smooth: true,
        symbolSize: 4,
        data: periods.map((p) => summarize(r.records.filter((x) => x.period === p))[key]),
      },
      {
        name: r.name + ' · 去年同期',
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        lineStyle: { type: 'dashed' as const, width: 1 },
        itemStyle: { color: '#a8b5c7' },
        data: periods.map((p) => {
          const period = `${Number(p.slice(0, 4)) - 1}${p.slice(4)}`;
          const matches = previous.filter((x) => x[dimension] === r.name && x.period === period);
          return matches.length ? summarize(matches)[key] : null;
        }),
      },
    ]),
  };
}
