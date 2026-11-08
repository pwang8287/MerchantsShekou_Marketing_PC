<script setup lang="ts">
import { computed, ref } from 'vue';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../../charts/components/BaseChart.vue';
import OrganizationContributionDrawer from '../../../components/dashboard/OrganizationContributionDrawer.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import {
  conversionAttribution,
  type AttributionDimension,
  type ConversionStageKey,
  type AttributionComparison,
} from '../../../utils/conversionAttribution';
import { fmt } from '../../../utils/metrics';
const props = defineProps<{ stage: { key: ConversionStageKey; name: string; unit: string } }>();
const store = useDashboardStore();
const dimension = ref<AttributionDimension>('channel');
const detailVisible = ref(false);
const comparisonMode = ref<AttributionComparison>('mom');
const comparisonLabel = computed(() => (comparisonMode.value === 'yoy' ? '同比' : '环比'));
const dimensions = [
  { key: 'channel', label: '渠道' },
  { key: 'group', label: '城市群' },
  { key: 'organization', label: '城市公司' },
  { key: 'project', label: '项目' },
] as const;
const analysis = computed(() =>
  conversionAttribution(
    store.rows,
    store.filter,
    props.stage.key,
    dimension.value,
    comparisonMode.value,
  ),
);
const signed = (value: number) => (value > 0 ? '+' : '') + fmt(value);
const option = computed<EChartsOption>(() => {
  const data = analysis.value;
  let running = data.previous;
  const changes = data.items.map((item) => {
    const before = running;
    running += item.delta;
    return {
      name: item.name,
      value: Math.abs(item.delta),
      base: Math.min(before, running),
      delta: item.delta,
    };
  });
  const entries = [
    { name: data.previousLabel, value: data.previous, base: 0, delta: null },
    ...changes,
    { name: data.currentLabel, value: data.current, base: 0, delta: null },
  ];
  return {
    grid: { left: 56, right: 15, top: 32, bottom: 80 },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#fff',
      borderColor: '#dfe7f1',
      textStyle: { color: '#43546e', fontSize: 11 },
      formatter: (raw: unknown) => {
        const index = (raw as { dataIndex: number }).dataIndex;
        const entry = entries[index];
        return `${entry.name}<br/>${entry.delta === null ? props.stage.name : '增长数量'}：${entry.delta === null ? fmt(entry.value) : signed(entry.delta)} ${props.stage.unit}`;
      },
    },
    xAxis: {
      type: 'category',
      data: entries.map((item) => item.name),
      axisTick: { show: false },
      axisLabel: {
        rotate: 35,
        fontSize: 10,
        color: '#71809a',
        width: 85,
        overflow: 'truncate',
        interval: 0,
      },
      axisLine: { lineStyle: { color: '#ccd5e2' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#71809a' },
      splitLine: { lineStyle: { color: '#edf1f7' } },
    },
    series: [
      {
        type: 'bar',
        stack: 'changes',
        silent: true,
        tooltip: { show: false },
        itemStyle: { color: 'transparent' },
        emphasis: { disabled: true },
        data: entries.map((item) => item.base),
      },
      {
        type: 'bar',
        stack: 'changes',
        barMaxWidth: 32,
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: '#43546e',
          formatter: (params) => {
            const entry = entries[params.dataIndex];
            return entry.delta === null ? fmt(entry.value) : signed(entry.delta);
          },
        },
        data: entries.map((item) => ({
          value: item.value,
          itemStyle: {
            color: item.delta === null ? '#2873ed' : item.delta >= 0 ? '#f45b69' : '#0aa582',
          },
        })),
      },
    ],
  };
});
</script>
<template>
  <div class="attribution-analysis">
    <div class="attribution-toolbar">
      <div class="attribution-comparison" role="group" aria-label="归因比较方式">
        <button
          :class="{ active: comparisonMode === 'yoy' }"
          :aria-pressed="comparisonMode === 'yoy'"
          @click="comparisonMode = 'yoy'"
        >
          同比
        </button>
        <button
          :class="{ active: comparisonMode === 'mom' }"
          :aria-pressed="comparisonMode === 'mom'"
          @click="comparisonMode = 'mom'"
        >
          环比
        </button>
      </div>
      <button class="attribution-detail-link" @click="detailVisible = true">查看明细</button>
    </div>
    <div class="attribution-cards">
      <div>
        <span>{{ analysis.currentLabel }}{{ stage.name }}</span
        ><strong>{{ fmt(analysis.current) }}</strong>
      </div>
      <div>
        <span>{{ analysis.previousLabel }}{{ stage.name }}</span
        ><strong>{{ fmt(analysis.previous) }}</strong>
      </div>
      <div>
        <span>{{ comparisonLabel }}增长数量</span><strong>{{ signed(analysis.delta) }}</strong>
      </div>
      <div>
        <span>{{ comparisonLabel }}增长率</span
        ><strong>{{
          analysis.rate === null
            ? '—'
            : (analysis.rate > 0 ? '+' : '') + fmt(analysis.rate, 2) + '%'
        }}</strong>
      </div>
    </div>
    <div class="attribution-dimensions" role="tablist" aria-label="归因维度">
      <button
        v-for="item in dimensions"
        :key="item.key"
        role="tab"
        :aria-selected="dimension === item.key"
        :class="{ active: dimension === item.key }"
        @click="dimension = item.key"
      >
        {{ item.label }}
      </button>
    </div>
    <BaseChart
      :option="option"
      :height="275"
      :loading="store.loading"
      :empty="!analysis.items.length"
      :unit="stage.unit"
    />
    <OrganizationContributionDrawer v-model="detailVisible" :stage="stage" />
  </div>
</template>
<style scoped>
.attribution-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.attribution-detail-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #4285f4;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.attribution-detail-link:hover {
  color: #1677ff;
}
.attribution-comparison {
  display: flex;
  width: fit-content;
  padding: 2px;
  background: #f5f6f8;
  border-radius: 5px;
}
.attribution-comparison button {
  border: 0;
  border-radius: 4px;
  padding: 4px 12px;
  background: transparent;
  color: #667380;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.attribution-comparison button.active {
  color: #2873ed;
  background: #fff;
  box-shadow: 0 1px 4px #00000010;
  font-weight: 600;
}
.attribution-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0;
}
.attribution-cards > div {
  background: #f5f7fb;
  border: 1px solid #e0e7f2;
  padding: 12px 8px;
  min-width: 0;
}
.attribution-cards span {
  display: block;
  color: #8090a7;
  font-size: 10px;
  line-height: 16px;
  overflow-wrap: anywhere;
}
.attribution-cards strong {
  display: block;
  color: #26394f;
  font-size: 20px;
  margin-top: 10px;
}
.attribution-dimensions {
  display: flex;
  background: #f5f6f8;
  border-radius: 5px;
  padding: 2px;
  gap: 4px;
}
.attribution-dimensions button {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #667380;
  padding: 6px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.attribution-dimensions button.active {
  background: #fff;
  box-shadow: 0 1px 4px #00000010;
  color: #26394f;
  font-weight: 600;
}
</style>
