<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../../charts/components/BaseChart.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import {
  buildPropertyDistribution,
  sumPropertyDistribution,
  areaBands,
  type PropertyMetric,
} from '../../../utils/propertyDistribution';
import {
  channelRankingDimensions,
  type ChannelRankingDimension,
} from '../../../utils/channelRanking';
import { fmt } from '../../../utils/metrics';
import { donutTooltip } from '../../../charts/options/donutTooltip';
const store = useDashboardStore();
const compositionHost = ref<HTMLElement>();
const compositionWidth = ref(360);
let compositionObserver: ResizeObserver | undefined;
onMounted(() => {
  compositionObserver = new ResizeObserver(([entry]) => {
    compositionWidth.value = entry.contentRect.width;
  });
  if (compositionHost.value) compositionObserver.observe(compositionHost.value);
});
onBeforeUnmount(() => compositionObserver?.disconnect());
const donutRadius = computed(() => Math.max(36, Math.min(57, (compositionWidth.value - 190) / 2)));
const metric = ref<PropertyMetric>('contracts');
const property = ref('');
const area = ref(areaBands[1]);
const dimension = ref<ChannelRankingDimension>('group');
const dimensions = computed(() => channelRankingDimensions(store.filter, store.cityScope));
const dimensionLabels = { group: '城市群', organization: '城市公司', project: '项目' };
watch(
  dimensions,
  (values) => {
    if (!values.includes(dimension.value)) dimension.value = values[0];
  },
  { immediate: true },
);
const metricNames: Record<PropertyMetric, string> = {
  contracts: '签约套数',
  subscriptionUnits: '认购套数',
  available: '可售套数',
};
const metricTitle = computed(() => metricNames[metric.value]);
const cells = computed(() => buildPropertyDistribution(store.filtered, store.filter.period[1]));
const propertyData = computed(() => sumPropertyDistribution(cells.value, 'property', metric.value));
const total = computed(() => propertyData.value.reduce((sum, row) => sum + row.value, 0));
const centerValueFontSize = computed(() =>
  Math.min(
    18,
    Math.max(10, Math.floor((donutRadius.value * 1.42 - 12) / (fmt(total.value).length * 0.62))),
  ),
);
const selectedCells = computed(() =>
  cells.value.filter((cell) => !property.value || cell.property === property.value),
);
const areaData = computed(() => sumPropertyDistribution(selectedCells.value, 'area', metric.value));
const selectedTotal = computed(() => areaData.value.reduce((sum, row) => sum + row.value, 0));
const organizationData = computed(() =>
  sumPropertyDistribution(
    selectedCells.value.filter((cell) => cell.area === area.value),
    dimension.value,
    metric.value,
  ).sort((a, b) => b.value - a.value),
);
const colors = ['#269dff', '#ffca40', '#50c878', '#ff7178', '#00bfae', '#c5a6e7'];
function selectProperty(name: string) {
  property.value = property.value === name ? '' : name;
}
const donut = computed<EChartsOption>(() => ({
  color: colors,
  legend: { show: false },
  tooltip: { ...donutTooltip(), formatter: '{b}：{c} 套 · {d}%' },
  series: [
    {
      type: 'pie',
      radius: [donutRadius.value * 0.71, donutRadius.value],
      center: ['50%', '50%'],
      label: { show: false },
      labelLine: { show: false },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      emphasis: { scale: true, scaleSize: 5 },
      data: propertyData.value.map((row) => ({
        ...row,
        itemStyle: { opacity: property.value && property.value !== row.name ? 0.28 : 1 },
      })),
    },
  ],
  graphic: [
    ...propertyData.value.flatMap((row, index) => {
      const slots = [
        { right: true, y: 123 },
        { right: true, y: 203 },
        { right: false, y: 203 },
        { right: false, y: 123 },
        { right: false, y: 43 },
        { right: true, y: 43 },
      ];
      const slot = slots[index];
      const centerX = compositionWidth.value / 2;
      const radius = donutRadius.value;
      const before = propertyData.value.slice(0, index).reduce((sum, item) => sum + item.value, 0);
      const angle = -Math.PI / 2 + ((before + row.value / 2) / (total.value || 1)) * Math.PI * 2;
      const labelX = centerX + (slot.right ? 1 : -1) * (radius + 24);
      return [
        {
          type: 'polyline' as const,
          silent: true,
          shape: {
            points: [
              [centerX + Math.cos(angle) * radius, 123 + Math.sin(angle) * radius],
              [centerX + Math.cos(angle) * (radius + 14), 123 + Math.sin(angle) * (radius + 14)],
              [labelX + (slot.right ? -5 : 5), slot.y],
            ],
          },
          style: { stroke: colors[index], lineWidth: 1.2, fill: 'none' },
        },
        {
          type: 'text' as const,
          silent: true,
          x: labelX,
          y: slot.y,
          style: {
            text: `{name|${row.name}}\n{value|${fmt(row.value)} 套}\n{percent|${fmt(total.value ? (row.value / total.value) * 100 : 0, 2)}%}`,
            textAlign: slot.right ? ('left' as const) : ('right' as const),
            textVerticalAlign: 'middle' as const,
            rich: {
              name: { fontSize: 11, lineHeight: 18, fontWeight: 600, fill: '#4a5e7a' },
              value: { fontSize: 11, lineHeight: 17, fontWeight: 500, fill: '#182b48' },
              percent: { fontSize: 10, lineHeight: 16, fill: '#7385a2' },
            },
          },
        },
      ];
    }),
    {
      type: 'text',
      left: 'center',
      top: 'middle',
      silent: true,
      style: {
        text: `{value|${fmt(total.value)}}\n{caption|全部业态 · 套}`,
        textAlign: 'center',
        rich: {
          value: {
            fill: '#182b48',
            fontSize: centerValueFontSize.value,
            fontWeight: 700,
            lineHeight: 24,
          },
          caption: { fill: '#7b8aa3', fontSize: 10, lineHeight: 16 },
        },
      },
    },
  ],
}));
function barOption(data: { name: string; value: number }[], selectable = false): EChartsOption {
  const plotData = data.map((row) => ({ ...row, average: false }));
  if (data.length) {
    plotData.splice(Math.ceil(data.length / 2), 0, {
      name: selectable ? '面积段均值' : `${dimensionLabels[dimension.value]}均值`,
      value: data.reduce((sum, row) => sum + row.value, 0) / data.length,
      average: true,
    });
  }
  const formatValue = (value: number) => fmt(value, Number.isInteger(value) ? 0 : 2);
  return {
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) => `${formatValue(Number(value))} 套`,
    },
    grid: { left: 12, right: 16, top: 28, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: plotData.map((row) => row.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#d8e2f0' } },
      axisLabel: {
        color: '#7385a2',
        fontSize: 11,
        interval: 0,
        rotate: selectable ? 0 : 25,
        width: selectable ? 68 : 100,
        overflow: 'break',
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      name: '单位：套',
      nameTextStyle: { color: '#7b8aa3', align: 'left' },
      axisLabel: { color: '#7385a2' },
      splitLine: { lineStyle: { type: 'dashed', color: '#e6edf6' } },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        data: plotData.map((row) => ({
          ...row,
          itemStyle: {
            color: '#2873ed',
            opacity: row.average ? 0.25 : selectable && row.name !== area.value ? 0.6 : 1,
            borderRadius: [5, 5, 0, 0],
            borderWidth: row.average ? 1 : 0,
            borderType: 'dashed',
            borderColor: '#667380',
          },
          cursor: row.average || !selectable ? 'default' : 'pointer',
        })),
        label: {
          show: true,
          position: 'top',
          color: '#43546e',
          fontSize: 11,
          formatter: (params) => formatValue(Number(params.value)),
        },
      },
    ],
    ...(plotData.length > 10
      ? {
          dataZoom: [
            { type: 'inside', startValue: 0, endValue: 9 },
            { type: 'slider', height: 12, bottom: 0 },
          ],
          grid: { left: 12, right: 16, top: 28, bottom: 30, containLabel: true },
        }
      : {}),
  };
}
const areaOption = computed(() => barOption(areaData.value, true));
const organizationOption = computed(() => barOption(organizationData.value));
function selectArea(name: string) {
  if (areaBands.includes(name)) area.value = name;
}
</script>
<template>
  <section class="panel property-distribution" v-loading="store.loading">
    <div class="property-metric-tabs" role="tablist" aria-label="套数分析指标">
      <button
        v-for="(name, key) in metricNames"
        :key="key"
        role="tab"
        :aria-selected="metric === key"
        :class="{ active: metric === key }"
        @click="metric = key"
      >
        {{ name }}
      </button>
    </div>
    <p class="distribution-hint">点击业态查看面积段分布，点击面积段查看对应组织分布</p>
    <div class="distribution-grid">
      <div ref="compositionHost" class="property-composition">
        <BaseChart
          :option="donut"
          :height="246"
          unit="套"
          :empty="!total"
          @select="selectProperty"
        />
      </div>
      <span class="distribution-arrow" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M11 5l5 5-5 5" />
        </svg>
      </span>
      <section class="distribution-chart">
        <header>
          <h3>{{ property || '全部业态' }} · {{ metricTitle }} · 面积段分析</h3>
        </header>
        <BaseChart
          :option="areaOption"
          :height="190"
          unit="套"
          :empty="!selectedTotal"
          @select="selectArea"
        />
      </section>
      <span class="distribution-arrow" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M11 5l5 5-5 5" />
        </svg>
      </span>
      <section class="distribution-chart">
        <header>
          <h3>{{ area }} · {{ metricTitle }}</h3>
          <el-radio-group
            v-if="dimensions.length > 1"
            v-model="dimension"
            size="small"
            aria-label="组织分布层级"
            ><el-radio-button v-for="value in dimensions" :key="value" :value="value">{{
              dimensionLabels[value]
            }}</el-radio-button></el-radio-group
          >
        </header>
        <BaseChart
          :option="organizationOption"
          :height="190"
          unit="套"
          :empty="!organizationData.some((row) => row.value)"
        />
      </section>
    </div>
  </section>
</template>
<style scoped>
.property-distribution {
  height: 354px;
  box-sizing: border-box;
  padding: 14px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}
.property-metric-tabs {
  display: flex;
  gap: 8px;
  align-items: stretch;
  margin-bottom: 8px;
}
.property-metric-tabs button {
  border: 0;
  border-top: 3px solid transparent;
  border-radius: 5px 5px 0 0;
  padding: 8px 18px;
  background: transparent;
  color: #7b8aa3;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.property-metric-tabs button.active {
  border-top-color: #4285ff;
  background: #f3f7ff;
  color: #2878ff;
}
.distribution-hint {
  color: #8999b1;
  font-size: 12px;
  margin: 0 0 8px;
}
.distribution-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.9fr) 24px minmax(0, 1fr) 24px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  flex: 1;
  min-height: 0;
}
.property-composition,
.distribution-chart {
  min-width: 0;
}
.distribution-chart {
  border: 1px solid #e1e8f3;
  border-radius: 8px;
  padding: 8px 10px 4px;
  align-self: stretch;
}
.distribution-chart header {
  min-height: 40px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.distribution-chart h3 {
  font-size: 13px;
  color: #182b48;
  margin: 0;
  line-height: 22px;
}
.distribution-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 32px;
  border-radius: 6px;
  background: #f3f7ff;
  color: #527dcc;
  pointer-events: none;
}
.distribution-arrow svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
@media (max-width: 1150px) {
  .property-distribution {
    height: auto;
    min-height: 354px;
  }
  .distribution-grid {
    grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1fr);
  }
  .distribution-arrow {
    display: none;
  }
  .distribution-chart:last-child {
    grid-column: 1 / -1;
  }
}
@media (max-width: 650px) {
  .distribution-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
