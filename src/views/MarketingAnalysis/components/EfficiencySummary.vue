<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { fmt } from '../../../utils/metrics';
import { calculateMarketingEfficiency } from '../../../utils/efficiency';
const store = useDashboardStore();
const metrics = computed(() => calculateMarketingEfficiency(store.filtered));
const values = computed(() => [
  { name: '营销费用', value: fmt(metrics.value.fee, 2), unit: '万元' },
  {
    name: '营销费率',
    value: metrics.value.feeRate === null ? '—' : fmt(metrics.value.feeRate, 2),
    unit: '%',
  },
  { name: '单条线索成本', value: fmt(metrics.value.leadCost, 2), unit: '元/组' },
  { name: '单组到访成本', value: fmt(metrics.value.visitCost, 2), unit: '元/组' },
  { name: '单套签约获客成本', value: fmt(metrics.value.acquisitionCost, 2), unit: '元/套' },
  { name: '营销投入产出比', value: fmt(metrics.value.roi, 1), unit: '倍' },
]);
</script>
<template>
  <section class="panel efficiency-summary">
    <header class="panel-head">
      <h3>营销效率指标</h3>
      <span class="panel-hint">营销费用与投入产出</span>
    </header>
    <div class="efficiency-grid">
      <div
        v-for="m in values"
        :key="m.name"
        class="efficiency-card"
        :title="
          m.name === '营销费率' ? '营销费用 ÷ 签约金额 × 100%；签约金额为零时显示 —' : undefined
        "
      >
        <span>{{ m.name }}</span
        ><strong
          >{{ store.filtered.length ? m.value : '—' }} <small>{{ m.unit }}</small></strong
        >
      </div>
    </div>
  </section>
</template>

<style scoped>
.efficiency-card {
  cursor: default;
}
.efficiency-card:hover > span {
  color: #71809a;
}
.efficiency-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
@media (max-width: 1250px) {
  .efficiency-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .efficiency-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
