<script setup lang="ts">
import { computed } from 'vue';
import ChartPanel from '../../../components/common/ChartPanel.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { trendOption } from '../../../charts/options';
import { filterRows, shiftPeriod, fmt, divide } from '../../../utils/metrics';
const store = useDashboardStore();
const trend = computed(() =>
  trendOption(
    store.filtered,
    filterRows(store.rows, store.filter, shiftPeriod(store.filter.period, -12)),
  ),
);
const stages = computed(() => {
  const s = store.summary;
  return [
    { name: '线索客户', value: s.leads, unit: '组', rate: 100 },
    { name: '到访客户', value: s.visits, unit: '组', rate: divide(s.visits, s.leads) * 100 },
    {
      name: '认购客户',
      value: s.subscriptions,
      unit: '组',
      rate: divide(s.subscriptions, s.visits) * 100,
    },
    {
      name: '签约客户',
      value: s.contracts,
      unit: '套',
      rate: divide(s.contracts, s.subscriptions) * 100,
    },
  ];
});
function drillMonth(name: string) {
  store.drill(
    name + ' · 月度经营明细',
    store.filtered.filter((r) => r.period === name),
  );
}
</script>
<template>
  <section class="panel operating-panel">
    <header class="panel-head">
      <h3>营销经营与转化分析</h3>
      <span class="panel-hint">签约口径 · 点击指标下钻分析</span>
    </header>
    <div class="operating-body">
      <div class="metric-tree">
        <div class="tree-context">
          {{ store.filter.project || store.filter.region || '全国项目'
          }}<span>{{ store.filter.period.join(' — ') }}</span>
        </div>
        <button
          class="tree-root"
          :disabled="!store.filtered.length"
          @click="store.drill('签约金额 · 经营明细')"
        >
          <span>签约金额</span
          ><strong>{{ fmt(store.summary.amount / 10000, 2) }}<small>亿元</small></strong>
        </button>
        <div class="tree-branches">
          <button @click="store.drill('签约套数 · 项目明细')">
            <span>签约套数</span
            ><strong>{{ fmt(store.summary.contracts) }} <small>套</small></strong>
          </button>
          <button @click="store.drill('套均签约金额 · 项目明细')">
            <span>套均签约金额</span
            ><strong
              >{{ fmt(divide(store.summary.amount, store.summary.contracts), 1) }}
              <small>万元/套</small></strong
            >
          </button>
        </div>
        <div class="conversion-path">
          <template v-for="(stage, i) in stages" :key="stage.name"
            ><span v-if="i" class="path-arrow"
              >→<small>{{ fmt(stage.rate, 1) }}%</small></span
            ><button @click="store.drill(stage.name + ' · 客户明细')">
              <span>{{ stage.name }}</span
              ><strong
                >{{ fmt(stage.value) }}<small>{{ stage.unit }}</small></strong
              >
            </button></template
          >
        </div>
        <p class="metric-tree-note">签约金额 = 签约套数 × 套均签约金额</p>
      </div>
      <ChartPanel
        class="nested-chart operating-trend"
        title="营销经营趋势"
        subtitle="签约、回款及去年同期对比"
        :option="trend"
        :height="255"
        unit="万元 / 套"
        @select="drillMonth"
      />
    </div>
  </section>
</template>
