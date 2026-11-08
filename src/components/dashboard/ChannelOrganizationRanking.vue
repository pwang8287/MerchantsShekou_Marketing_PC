<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { EChartsOption } from 'echarts';
import type { MarketingPerformanceMetric } from '../../types';
import { useDashboardStore } from '../../stores/dashboard';
import BaseChart from '../../charts/components/BaseChart.vue';
import { fmt } from '../../utils/metrics';
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
const option = computed<EChartsOption>(() => ({
  grid: { left: 55, right: 20, top: 30, bottom: groups.value.length > 12 ? 90 : 60 },
  tooltip: {
    trigger: 'item',
    confine: true,
    backgroundColor: '#fff',
    borderColor: '#dfe7f1',
    textStyle: { color: '#43546e', fontSize: 12 },
    formatter: (raw: unknown) => {
      const item = groups.value[(raw as { dataIndex: number }).dataIndex];
      const name = item.name.replace(
        /[&<>"']/g,
        (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
      );
      return `${name}<br/>${metricDefinition.value.name}：${fmt(item.value)} ${metricDefinition.value.unit}`;
    },
  },
  xAxis: {
    type: 'category',
    data: groups.value.map((row) => row.name),
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
  series: [
    {
      type: 'bar',
      barMaxWidth: 28,
      itemStyle: { color: '#2873ed', borderRadius: [4, 4, 0, 0] },
      label: {
        show: true,
        position: 'top',
        color: '#71809a',
        fontSize: 11,
        formatter: (params) => fmt(Number(params.value)),
      },
      data: groups.value.map((row) => row.value),
    },
  ],
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
