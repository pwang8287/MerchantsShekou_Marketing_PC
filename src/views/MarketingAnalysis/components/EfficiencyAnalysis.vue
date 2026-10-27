<script setup lang="ts">
import { computed, ref } from 'vue';
import ChartPanel from '../../../components/common/ChartPanel.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { efficiencyOption, efficiencyTrend, barOption } from '../../../charts/options';
import { divide, fmt, groupRows } from '../../../utils/metrics';
import type { Dimension, MarketingEfficiencyMetric } from '../../../types';
const store = useDashboardStore();
const dimension = ref<Dimension>('project');
const ranking = computed(() => barOption(groupRows(store.filtered, dimension.value)));
const metrics = computed<MarketingEfficiencyMetric>(() => {
  const s = store.summary;
  return {
    fee: s.fee,
    leadCost: divide(s.fee * 10000, s.leads),
    visitCost: divide(s.fee * 10000, s.visits),
    acquisitionCost: s.acquisition,
    roi: s.roi,
  };
});
const values = computed(() => [
  { name: '营销费用', value: fmt(metrics.value.fee, 1), unit: '万元' },
  { name: '单条线索成本', value: fmt(metrics.value.leadCost), unit: '元/组' },
  { name: '单组到访成本', value: fmt(metrics.value.visitCost), unit: '元/组' },
  { name: '单套签约获客成本', value: fmt(metrics.value.acquisitionCost), unit: '元/套' },
  { name: '营销投入产出比', value: fmt(metrics.value.roi, 1), unit: '倍' },
]);
const option = computed(() => efficiencyOption(store.filtered));
const trend = computed(() => efficiencyTrend(store.filtered));
</script>
<template>
  <section class="panel efficiency-summary">
    <header class="panel-head">
      <h3>营销效率指标</h3>
      <span class="panel-hint">营销费用与投入产出</span>
    </header>
    <div class="efficiency-grid">
      <button
        v-for="m in values"
        :key="m.name"
        class="efficiency-card"
        @click="store.drill(m.name + ' · 效率明细')"
      >
        <span>{{ m.name }}</span
        ><strong
          >{{ store.filtered.length ? m.value : '—' }} <small>{{ m.unit }}</small></strong
        >
      </button>
    </div>
  </section>
  <div class="chart-grid secondary-charts">
    <ChartPanel
      title="项目销售业绩排名"
      subtitle="签约金额 · 万元"
      :option="ranking"
      :height="270"
      unit="万元"
      @select="
        (name) =>
          store.drill(
            name + ' · 销售业绩',
            store.filtered.filter((r) => r[dimension] === name),
          )
      "
      ><template #tools
        ><el-select v-model="dimension" size="small" class="chart-select" aria-label="排名维度"
          ><el-option label="按项目" value="project" /><el-option
            label="按城市"
            value="city" /><el-option label="按区域" value="region" /></el-select></template
    ></ChartPanel>
    <ChartPanel
      title="营销费用与投入产出趋势"
      subtitle="投入产出比 = 签约金额 / 营销费用"
      :option="trend"
      :height="270"
      unit="万元 / 倍"
      @select="
        (name) =>
          store.drill(
            name + ' · 营销费用明细',
            store.filtered.filter((r) => r.period === name),
          )
      "
    /><ChartPanel
      title="渠道获客成本对比"
      subtitle="营销费用 / 签约套数，成本越低效率越高"
      :option="option"
      :height="270"
      unit="元/套"
      @select="
        (name) =>
          store.drill(
            name + ' · 获客成本',
            store.filtered.filter((r) => r.channel === name),
          )
      "
    />
  </div>
</template>
