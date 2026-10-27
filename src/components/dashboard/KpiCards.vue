<script setup lang="ts">
import { useDashboard } from '../../composables/useDashboard';
import { Money, House, Wallet, Aim } from '@element-plus/icons-vue';
import { trendLabel } from '../../utils/metrics';
const { store, kpis } = useDashboard();
const icons = [Money, House, Wallet, Aim];
</script>
<template>
  <div class="kpi-grid" v-loading="store.loading">
    <button
      v-for="(k, i) in kpis"
      :key="k.key"
      class="kpi-card"
      :class="{ selected: store.selectedKpi === k.key }"
      :disabled="!store.filtered.length || !!store.error"
      @click="
        store.selectedKpi = k.key;
        store.drill(k.label + ' · 项目明细');
      "
    >
      <div class="kpi-label">
        <span class="kpi-icon"
          ><el-icon><component :is="icons[i]" /></el-icon></span
        ><span>{{ k.label }}</span>
      </div>
      <div class="kpi-period">所选期间累计</div>
      <div class="kpi-value">
        {{ store.filtered.length ? k.value : '—' }} <small>{{ k.unit }}</small>
      </div>
      <div class="kpi-compare">
        <span
          >同比
          <b :class="!Number.isFinite(k.yoy) ? 'neutral' : k.yoy >= 0 ? 'positive' : 'negative'">{{
            trendLabel(k.yoy)
          }}</b></span
        ><span
          >环比
          <b :class="!Number.isFinite(k.mom) ? 'neutral' : k.mom >= 0 ? 'positive' : 'negative'">{{
            trendLabel(k.mom)
          }}</b></span
        >
      </div>
      <div class="kpi-bottom">
        <span>{{ k.note }}</span
        ><span class="kpi-detail-link">查看明细 ↗</span>
      </div>
    </button>
  </div>
</template>
