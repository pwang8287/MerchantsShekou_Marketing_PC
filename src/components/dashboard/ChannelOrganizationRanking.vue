<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { EChartsOption } from 'echarts';
import type { MarketingPerformanceMetric } from '../../types';
import { useDashboardStore } from '../../stores/dashboard';
import BaseChart from '../../charts/components/BaseChart.vue';
import { fmt } from '../../utils/metrics';
import { comparisonChannelRows } from '../../utils/channelBenchmark';
import {
  channelRankingDimensions,
  channelRankingRows,
  channelRankingMetrics,
  type ChannelRankingDimension,
  type ChannelRankingMetric,
} from '../../utils/channelRanking';
const props = withDefaults(
  defineProps<{
    rows: MarketingPerformanceMetric[];
    channel: string;
    metric?: ChannelRankingMetric;
  }>(),
  { metric: 'visitPeople' },
);
const store = useDashboardStore();
const dimensions = computed(() => channelRankingDimensions(store.filter, store.cityScope));
const activeDimension = ref<ChannelRankingDimension>('group');
watch(
  dimensions,
  (options) => {
    activeDimension.value = options[0];
  },
  { immediate: true },
);
const labels = { group: '城市群', organization: '城市', project: '项目' };
const metricDefinition = computed(() => channelRankingMetrics[props.metric]);
const groups = computed(() => channelRankingRows(props.rows, activeDimension.value, props.metric));
const comparisonSeries = computed(() => {
  const definitions = [{ key: 'current', name: '本期值', color: '#2873ed', rows: props.rows }];
  if (store.filter.periodType === 'month')
    definitions.push({
      key: 'mom',
      name: '上个月值',
      color: '#99a5b5',
      rows: comparisonChannelRows(store.rows, store.filter, props.channel, 'mom') || [],
    });
  if (store.filter.periodType === 'month' || store.filter.periodType === 'year')
    definitions.push({
      key: 'yoy',
      name: '去年同期值',
      color: '#c4cbd4',
      rows: comparisonChannelRows(store.rows, store.filter, props.channel, 'yoy') || [],
    });
  return definitions.map((item) => ({
    ...item,
    values: new Map(
      channelRankingRows(item.rows, activeDimension.value, props.metric).map((row) => [
        row.name,
        row.value,
      ]),
    ),
  }));
});
const categories = computed(() => {
  const result = groups.value.map((row) => ({ name: row.name, mean: false }));
  if (result.length)
    result.splice(Math.ceil(result.length / 2), 0, {
      name: `${labels[activeDimension.value]}均值`,
      mean: true,
    });
  return result;
});
const option = computed<EChartsOption>(() => ({
  grid: { left: 55, right: 20, top: 36, bottom: groups.value.length > 12 ? 100 : 78 },
  legend: { bottom: 0, textStyle: { color: '#667380', fontSize: 11 } },
  tooltip: {
    trigger: 'axis',
    confine: true,
    backgroundColor: '#fff',
    borderColor: '#dfe7f1',
    textStyle: { color: '#43546e', fontSize: 12 },
    valueFormatter: (value) =>
      value == null ? '—' : `${fmt(Number(value), 2)} ${metricDefinition.value.unit}`,
  },
  xAxis: {
    type: 'category',
    data: categories.value.map((row) => row.name),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#666666' } },
    axisLabel: {
      color: '#667380',
      fontSize: 11,
      interval: 0,
      rotate: activeDimension.value === 'project' ? 20 : 0,
      width: activeDimension.value === 'project' ? 110 : 85,
      overflow: 'truncate',
    },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#667380', fontSize: 11 },
    splitLine: { lineStyle: { color: '#dfe7f1', type: 'dashed' } },
  },
  dataZoom:
    groups.value.length > 12
      ? [{ type: 'slider', startValue: 0, endValue: 11, height: 15, bottom: 2 }, { type: 'inside' }]
      : [],
  series: comparisonSeries.value.map((item) => ({
    name: item.name,
    type: 'bar',
    barMaxWidth: 24,
    itemStyle: { color: item.color, borderRadius: [4, 4, 0, 0] },
    label: {
      show: true,
      position: 'top',
      color: '#71809a',
      fontSize: 11,
      formatter: (params) =>
        params.value == null
          ? '—'
          : fmt(Number(params.value), Number.isInteger(Number(params.value)) ? 0 : 2),
    },
    data: categories.value.map((category) => {
      if (!category.mean) return item.values.get(category.name) ?? null;
      const values = groups.value
        .map((row) => item.values.get(row.name))
        .filter((value): value is number => value !== undefined);
      return {
        value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
        itemStyle: { opacity: 0.25, borderColor: '#667380', borderWidth: 1, borderType: 'dashed' },
      };
    }),
  })),
}));
</script>
<template>
  <section class="channel-ranking-panel">
    <header class="panel-head ranking-header">
      <h3>{{ channel }} · {{ metricDefinition.name }}分布</h3>
      <div v-if="dimensions.length > 1" class="ranking-tabs" role="tablist" aria-label="排名维度">
        <button
          v-for="dimension in dimensions"
          :key="dimension"
          role="tab"
          :aria-selected="activeDimension === dimension"
          :class="{ active: activeDimension === dimension }"
          @click="activeDimension = dimension"
        >
          {{ labels[dimension] }}
        </button>
      </div>
    </header>
    <p class="ranking-unit">单位：{{ metricDefinition.unit }}</p>
    <BaseChart
      :option="option"
      :height="310"
      :empty="!groups.length"
      :loading="store.loading"
      :unit="metricDefinition.unit"
    />
  </section>
</template>
<style scoped>
.channel-ranking-panel {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  min-width: 0;
}
.ranking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.ranking-header h3 {
  font-size: 14px;
  color: #14243d;
  margin: 0;
}
.ranking-tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: #f5f6f8;
  border-radius: 5px;
}
.ranking-tabs button {
  font: inherit;
  font-size: 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #667380;
  padding: 4px 10px;
  cursor: pointer;
}
.ranking-tabs button.active {
  background: #fff;
  color: #26394f;
  box-shadow: 0 1px 4px #00000010;
  font-weight: 600;
}
.ranking-unit {
  font-size: 11px;
  color: #8090a7;
  margin: 0 0 8px;
}
</style>
