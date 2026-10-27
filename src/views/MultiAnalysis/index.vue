<script setup lang="ts">
import { computed, ref } from 'vue';
import KpiCards from '../../components/dashboard/KpiCards.vue';
import ChartPanel from '../../components/common/ChartPanel.vue';
import DimensionMatrix from './components/DimensionMatrix.vue';
import CustomerProfile from './components/CustomerProfile.vue';
import MarketingScatter from './components/MarketingScatter.vue';
import MultiDimensionTable from './components/MultiDimensionTable.vue';
import { useDashboardStore } from '../../stores/dashboard';
import { dimensions, metricDefs, groupRows, filterRows, shiftPeriod } from '../../utils/metrics';
import { comparisonTrend, barOption } from '../../charts/options';
import type { Dimension, MetricKey } from '../../types';
const store = useDashboardStore();
const dimension = ref<Dimension>('region');
const metric = ref<MetricKey>('amount');
const trendDim = ref<'region' | 'channel' | 'project'>('region');
const trend = computed(() =>
  comparisonTrend(
    store.filtered,
    trendDim.value,
    metric.value,
    filterRows(store.rows, store.filter, shiftPeriod(store.filter.period, -12)),
  ),
);
const ranking = computed(() => barOption(groupRows(store.filtered, dimension.value), metric.value));
</script>
<template>
  <KpiCards />
  <div class="panel analysis-toolbar">
    <h2>多维分析</h2>
    <div class="dimension-controls">
      <span>分析维度</span
      ><el-select v-model="dimension" aria-label="分析维度"
        ><el-option
          v-for="(name, key) in dimensions"
          :key="key"
          :label="name"
          :value="key" /></el-select
      ><span>分析指标</span
      ><el-select v-model="metric" aria-label="分析指标"
        ><el-option v-for="(def, key) in metricDefs" :key="key" :label="def.label" :value="key"
      /></el-select>
    </div>
  </div>
  <DimensionMatrix :metric="metric" />
  <div class="chart-grid"><CustomerProfile /><MarketingScatter :dimension="dimension" /></div>
  <div class="chart-grid">
    <ChartPanel
      title="多维指标趋势"
      :subtitle="metricDefs[metric].label + ' · 前五个维度，虚线为去年同期'"
      :option="trend"
      :height="230"
      :unit="metricDefs[metric].unit"
      @select="
        (name) =>
          store.drill(
            name + ' · 多维趋势明细',
            store.filtered.filter((r) => r.period === name),
          )
      "
      ><template #tools
        ><el-select v-model="trendDim" size="small" class="chart-select" aria-label="趋势维度"
          ><el-option label="按区域" value="region" /><el-option
            label="按渠道"
            value="channel" /><el-option
            label="按项目"
            value="project" /></el-select></template></ChartPanel
    ><ChartPanel
      title="指标贡献排名"
      :subtitle="metricDefs[metric].label + ' · ' + metricDefs[metric].unit"
      :option="ranking"
      :height="230"
      :unit="metricDefs[metric].unit"
      @select="
        (name) =>
          store.drill(
            name + ' · 贡献明细',
            store.filtered.filter((r) => r[dimension] === name),
          )
      "
    />
  </div>
  <MultiDimensionTable :dimension="dimension" />
</template>
