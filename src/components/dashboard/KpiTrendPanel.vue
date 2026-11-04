<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../charts/components/BaseChart.vue';
import { buildKpiTrend, type KpiTrendContext } from '../../utils/kpiTrend';
import { fmt } from '../../utils/metrics';
const props = withDefaults(
  defineProps<{ context: KpiTrendContext; chartHeight?: number; accentColor?: string }>(),
  {
    chartHeight: 240,
    accentColor: '#4285f4',
  },
);
function tint(alpha: number) {
  const hex = props.accentColor.replace('#', '');
  return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${alpha})`;
}
const view = computed(() => buildKpiTrend(props.context));
const isDaily = computed(() => view.value.grain === 'day');
const periodUnit = computed(() =>
  view.value.grain === 'quarter' ? '季' : view.value.grain === 'year' ? '年' : '月',
);
const latestCaption = computed(() => (isDaily.value ? '昨日值' : `末${periodUnit.value}值`));
const formatValue = (value: number | null) =>
  value === null
    ? '-'
    : fmt(value, view.value.unit.includes('元') || view.value.unit === '%' ? 2 : 0);
const chart = computed<EChartsOption>(() => {
  const points = view.value.points;
  const last = points.length - 1;
  const labelStep = Math.max(1, Math.ceil(points.length / 12));
  const escape = (text: string) =>
    text.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
  return {
    animationDuration: 300,
    grid: { left: 54, right: 30, top: 34, bottom: 54 },
    tooltip: {
      trigger: 'axis',
      renderMode: 'html',
      appendTo: 'body',
      confine: false,
      className: 'dashboard-floating-tooltip',
      transitionDuration: 0,
      backgroundColor: '#fff',
      borderColor: '#e2e8f0',
      textStyle: { color: '#43546e', fontSize: 11 },
      extraCssText:
        'box-shadow:0 8px 24px #10233f18;border-radius:8px;max-width:calc(100vw - 24px);z-index:2200;',
      formatter: (input: unknown) => {
        const point = (Array.isArray(input) ? input[0] : input) as { dataIndex: number };
        const item = points[point.dataIndex];
        return item
          ? `<b>${escape(item.date)}</b><br/>${isDaily.value ? '' : item.start + ' 至 ' + item.end + '<br/>'}${escape(view.value.label)}：${formatValue(item.value)}${item.value === null ? '' : ' ' + view.value.unit}`
          : '';
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: points.length === 1,
      data: points.map((p) => p.date),
      axisLine: { lineStyle: { color: '#dce5f2' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#7186a4',
        fontSize: 11,
        margin: 16,
        hideOverlap: true,
        interval: (index: number) => index === last || index % labelStep === 0,
        formatter: (date: string, index: number) => {
          const text = isDaily.value
            ? date.slice(5).replace('-', '/')
            : view.value.grain === 'quarter' || view.value.grain === 'year'
              ? date
              : (index === 0 || date.endsWith('-01') ? date.slice(2, 4) + '年' : '') +
                Number(date.slice(5)) +
                '月';
          return index === last
            ? `{current|${text}}\n{caption|${isDaily.value ? '昨日' : '末' + periodUnit.value}}`
            : text;
        },
        rich: {
          current: { color: props.accentColor, fontWeight: 700, lineHeight: 20 },
          caption: { color: props.accentColor, fontSize: 10, lineHeight: 16 },
        },
      },
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      minInterval: view.value.unit === '%' ? undefined : 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8a9db7', fontSize: 11 },
      splitLine: { lineStyle: { color: '#edf1f7' } },
    },
    series: [
      {
        type: 'line',
        name: view.value.label,
        smooth: 0.28,
        connectNulls: false,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: props.accentColor },
        itemStyle: { color: '#fff', borderColor: props.accentColor, borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: tint(0.16) },
              { offset: 1, color: tint(0.015) },
            ],
          },
        },
        data: points.map((point, index) => ({
          value: point.value,
          symbolSize: index === last ? 15 : 8,
          itemStyle:
            index === last
              ? { color: props.accentColor, borderColor: tint(0.16), borderWidth: 5 }
              : undefined,
          label: {
            show: point.value !== null && (index === last || index % labelStep === 0),
            position: index === last || index % 2 === 0 ? 'top' : 'bottom',
            distance: index === last ? 10 : 8,
            align: index === 0 && index !== last ? 'left' : undefined,
            color: props.accentColor,
            fontSize: 11,
            fontWeight: index === last ? 700 : 400,
            formatter: formatValue(point.value),
          },
        })),
      },
    ],
  };
});
</script>
<template>
  <section
    class="kpi-trend-panel"
    :style="{ '--trend-accent': accentColor }"
    :aria-label="view.label + '趋势'"
  >
    <header class="trend-panel-header">
      <div class="trend-dialog-heading">
        <div class="trend-title">
          <i></i>
          <h3>{{ view.label }}</h3>
          <span>{{ view.description }}趋势</span>
        </div>
        <div class="trend-headline">
          <strong>{{ formatValue(view.latest) }}</strong
          ><span v-if="view.latest !== null">{{ view.unit }}</span
          ><small>{{ latestCaption }}</small>
        </div>
      </div>
    </header>
    <div class="trend-panel-chart">
      <BaseChart
        :option="chart"
        :height="chartHeight"
        :empty="!view.points.some((p) => p.value !== null)"
        :unit="view.unit"
      />
    </div>
    <footer class="trend-panel-footer">
      <div class="trend-dialog-legend">
        <span><i></i>{{ isDaily ? '每日值' : periodUnit + '度值' }}</span
        ><span><i class="current"></i>{{ isDaily ? '昨日值' : '所选周期' + latestCaption }}</span
        ><small v-if="!isDaily">末期统计至所选截止日期</small>
      </div>
    </footer>
  </section>
</template>
<style>
.kpi-trend-panel {
  padding: 0;
  border-radius: 12px;
  overflow: hidden;
}
.kpi-trend-panel .trend-panel-header {
  padding: 14px 20px 12px;
  margin: 0;
  border-bottom: 1px solid #edf1f7;
  background: linear-gradient(110deg, #f8fbff, #fff 72%);
}
.kpi-trend-panel .trend-panel-chart {
  padding: 8px 8px 0;
}
.kpi-trend-panel .trend-panel-footer {
  border-top: 1px solid #edf1f7;
  background: #f8faff;
  padding: 10px 20px;
  text-align: left;
}
.kpi-trend-panel .trend-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-right: 20px;
}
.kpi-trend-panel .trend-title i {
  height: 20px;
  width: 5px;
  background: var(--trend-accent);
  border-radius: 4px;
}
.kpi-trend-panel h3 {
  margin: 0;
  font-size: 15px;
  color: var(--trend-accent);
}
.kpi-trend-panel .trend-title > span {
  font-size: 12px;
  color: #71809a;
}
.kpi-trend-panel .trend-headline {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 6px;
}
.kpi-trend-panel .trend-headline strong {
  color: var(--trend-accent);
  font-size: 30px;
  line-height: 1.25;
}
.kpi-trend-panel .trend-headline > span {
  color: #71809a;
  font-size: 12px;
}
.kpi-trend-panel .trend-headline small {
  color: #8a99ae;
  margin-left: 4px;
  font-size: 11px;
}
.kpi-trend-panel .trend-dialog-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: #71809a;
}
.kpi-trend-panel .trend-dialog-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.kpi-trend-panel .trend-dialog-legend i {
  display: inline-block;
  height: 9px;
  width: 9px;
  border: 2px solid var(--trend-accent);
  border-radius: 50%;
  background: #fff;
}
.kpi-trend-panel .trend-dialog-legend i.current {
  background: var(--trend-accent);
}
.kpi-trend-panel .trend-dialog-legend small {
  margin-left: auto;
  color: #9aa7b9;
  font-size: 11px;
}
</style>
