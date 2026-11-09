<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Sort } from '@element-plus/icons-vue';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../../charts/components/BaseChart.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { fmt, groupRows, summarize } from '../../../utils/metrics';
import {
  channelRankingDimensions,
  type ChannelRankingDimension,
} from '../../../utils/channelRanking';
import organizationTree from '../../../mocks/organizationTree.json';
import type { Summary } from '../../../types';
import CustomerStructureAnalysis from './CustomerStructureAnalysis.vue';

const store = useDashboardStore();
const route = useRoute();
const isProjectDetail = computed(() => route.name === 'project-marketing-detail');
const dimensions = computed(() => channelRankingDimensions(store.filter, store.cityScope));
const dimension = ref<ChannelRankingDimension>('group');
const dimensionNames = { group: '城市群', organization: '城市', project: '项目' };
watch(
  dimensions,
  (available) => {
    if (!available.includes(dimension.value)) dimension.value = available[0];
  },
  { immediate: true },
);
const metrics = [
  { key: 'leads', label: '线索数量', color: '#4285f4', unit: '组' },
  { key: 'visitPeople', label: '到访人数', color: '#39b2c6', unit: '人' },
  { key: 'subscriptionUnits', label: '认购套数', color: '#f5b94c', unit: '套' },
  { key: 'contracts', label: '签约套数', color: '#9b79d4', unit: '套' },
  { key: 'leadToVisit', label: '线索至到访转化率', color: '#84aef7', unit: '%' },
  { key: 'visitToSubscription', label: '到访至认购转化率', color: '#57becb', unit: '%' },
  { key: 'subscriptionToContract', label: '认购至签约转化率', color: '#f4c66b', unit: '%' },
] as const;
type MetricKey = (typeof metrics)[number]['key'];
const sortKey = ref<MetricKey>('leads');
function value(row: Summary, key: MetricKey): number | null {
  if (key === 'leadToVisit') return row.leads ? (row.visitPeople / row.leads) * 100 : null;
  if (key === 'visitToSubscription')
    return row.visitPeople ? (row.subscriptionUnits / row.visitPeople) * 100 : null;
  if (key === 'subscriptionToContract')
    return row.subscriptionUnits ? (row.contracts / row.subscriptionUnits) * 100 : null;
  return row[key];
}
const groups = computed(() => {
  const facts =
    dimension.value === 'group'
      ? store.filtered.map((row) => ({
          ...row,
          region:
            organizationTree.children.find((group) => group.children.includes(row.organization))
              ?.name || row.region,
        }))
      : store.filtered;
  return groupRows(facts, dimension.value === 'group' ? 'region' : dimension.value).sort(
    (a, b) =>
      (value(b, sortKey.value) ?? -Infinity) - (value(a, sortKey.value) ?? -Infinity) ||
      a.name.localeCompare(b.name, 'zh-CN'),
  );
});
const plotRows = computed(() => {
  if (!groups.value.length) return [];
  const summary = summarize(store.filtered);
  const count = groups.value.length;
  const average = Object.fromEntries(
    metrics.map((metric) => [
      metric.key,
      metric.unit === '%' ? value(summary, metric.key) : summary[metric.key as 'leads'] / count,
    ]),
  ) as Record<MetricKey, number | null>;
  const rows = groups.value.map((row) => ({
    name: row.name,
    average: false,
    values: Object.fromEntries(
      metrics.map((metric) => [metric.key, value(row, metric.key)]),
    ) as Record<MetricKey, number | null>,
  }));
  rows.splice(Math.ceil(rows.length / 2), 0, {
    name: dimensionNames[dimension.value] + '均值',
    average: true,
    values: average,
  });
  return rows;
});
const option = computed<EChartsOption>(() => ({
  color: metrics.map((metric) => metric.color),
  tooltip: {
    trigger: 'axis',
    confine: true,
    axisPointer: { type: 'shadow' },
  },
  legend: { bottom: 6, type: 'scroll', textStyle: { color: '#667380', fontSize: 11 } },
  grid: { top: 26, left: 20, right: 24, bottom: 38, containLabel: true },
  xAxis: {
    type: 'category',
    data: plotRows.value.map((row) => row.name),
    axisLine: { lineStyle: { color: '#dce4f0' } },
    axisTick: { alignWithLabel: true },
    axisLabel: {
      color: '#7e8da4',
      fontSize: 11,
      interval: 0,
      rotate: dimension.value === 'project' ? 25 : 20,
      formatter: (name: string) => (name.length > 12 ? name.slice(0, 11) + '…' : name),
    },
  },
  yAxis: [
    {
      type: 'value',
      name: '数量',
      min: 0,
      nameTextStyle: { color: '#7e8da4' },
      axisLabel: { color: '#7e8da4' },
      splitLine: { lineStyle: { color: '#edf1f7', type: 'dashed' } },
    },
    {
      type: 'value',
      name: '转化率（%）',
      min: 0,
      nameTextStyle: { color: '#7e8da4', align: 'right' },
      axisLabel: { color: '#7e8da4' },
      splitLine: { show: false },
    },
  ],
  series: metrics.map((metric) => ({
    name: metric.label,
    type: metric.unit === '%' ? 'line' : 'bar',
    yAxisIndex: metric.unit === '%' ? 1 : 0,
    barMaxWidth: 24,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: { width: 2 },
    cursor: 'default',
    tooltip: {
      valueFormatter: (v: unknown) =>
        v == null ? '—' : fmt(Number(v), metric.unit === '%' ? 2 : 0) + ' ' + metric.unit,
    },
    data: plotRows.value.map((row) => ({
      value: row.values[metric.key],
      itemStyle: {
        color: metric.color,
        opacity: row.average ? 0.6 : 1,
        borderRadius: metric.unit === '%' ? undefined : [3, 3, 0, 0],
        borderWidth: row.average ? 1 : 0,
        borderType: 'dashed',
        borderColor: '#667380',
      },
    })),
  })),
  ...(plotRows.value.length > 15
    ? {
        dataZoom: [
          { type: 'inside' as const, start: 0, end: (15 / plotRows.value.length) * 100 },
          {
            type: 'slider' as const,
            bottom: 34,
            height: 12,
            start: 0,
            end: (15 / plotRows.value.length) * 100,
          },
        ],
      }
    : {}),
}));
</script>

<template>
  <CustomerStructureAnalysis v-if="isProjectDetail" />
  <section v-else class="panel conversion-comparison-panel">
    <header class="panel-head">
      <div>
        <h3>营销转化对比分析</h3>
      </div>
    </header>
    <div class="comparison-toolbar">
      <div class="sort-controls">
        <span>排序字段</span>
        <el-select
          v-model="sortKey"
          class="comparison-sort-select"
          popper-class="comparison-sort-menu"
          aria-label="排序字段"
        >
          <template #prefix
            ><el-icon><Sort /></el-icon
          ></template>
          <el-option
            v-for="metric in metrics"
            :key="metric.key"
            :label="metric.label"
            :value="metric.key"
          />
        </el-select>
      </div>
      <div
        v-if="dimensions.length > 1"
        class="comparison-switch"
        role="group"
        aria-label="组织层级"
      >
        <button
          v-for="level in dimensions"
          :key="level"
          :class="{ active: dimension === level }"
          :aria-pressed="dimension === level"
          @click="dimension = level"
        >
          {{ dimensionNames[level] }}
        </button>
      </div>
    </div>
    <BaseChart :option="option" :height="240" :empty="!groups.length" :loading="store.loading" />
  </section>
</template>
<style scoped>
.conversion-comparison-panel {
  height: 354px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 14px;
  margin-bottom: 16px;
  min-width: 0;
}
.conversion-comparison-panel > .panel-head {
  margin-bottom: 0;
  flex-shrink: 0;
}
.conversion-comparison-panel > .chart-root {
  flex: 1;
  min-height: 0;
}
.comparison-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin: 8px 0;
  flex-shrink: 0;
}
.sort-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.sort-controls > span {
  flex-shrink: 0;
  color: #8090a7;
  font-size: 12px;
}
.comparison-sort-select {
  width: 180px;
  height: 26px;
  --el-component-size: 26px;
}
.comparison-sort-select :deep(.el-select__wrapper) {
  height: 26px;
  min-height: 26px;
  box-sizing: border-box;
  padding: 0 10px;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 0 0 1px #d6e1f2 inset;
  font-size: 12px;
  font-weight: 400;
}
.comparison-sort-select :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px #b8c9e1 inset;
}
.comparison-sort-select :deep(.el-select__wrapper.is-focused) {
  box-shadow:
    0 0 0 1px #168bff inset,
    0 0 0 2px rgb(22 139 255 / 20%);
}
.comparison-sort-select :deep(.el-select__selected-item) {
  color: #667380;
}
.comparison-sort-select :deep(.el-select__prefix),
.comparison-sort-select :deep(.el-select__caret) {
  color: #a2a8b2;
}
.comparison-sort-select :deep(.el-select__prefix) {
  font-size: 13.5px;
  margin-right: 8px;
}
.comparison-sort-select :deep(.el-icon) {
  width: 13.5px;
  height: 13.5px;
  font-size: 13.5px;
}
.comparison-switch {
  display: inline-flex;
  flex-wrap: wrap;
  padding: 2px;
  gap: 2px;
  background: #f5f6f8;
  border-radius: 5px;
}
.comparison-switch button {
  padding: 6px 10px;
  border: 0;
  background: transparent;
  border-radius: 4px;
  color: #667380;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.comparison-switch button.active {
  background: #fff;
  color: #26394f;
  box-shadow: 0 1px 4px #00000010;
  font-weight: 600;
}
</style>
<style>
.el-popper.comparison-sort-menu {
  border: 1px solid #dfe6f2;
  border-radius: 8px;
  box-shadow: 0 14px 36px #233b651a;
  overflow: hidden;
}
.comparison-sort-menu .el-select-dropdown__item {
  height: 46px;
  line-height: 46px;
  padding: 0 20px;
  color: #4a5e7a;
  font-size: 14px;
}
.comparison-sort-menu .el-select-dropdown__item.is-hovering {
  background: #f7faff;
}
.comparison-sort-menu .el-select-dropdown__item.is-selected {
  background: #f0f5ff;
  color: #4879d1;
  font-weight: 600;
}
</style>
