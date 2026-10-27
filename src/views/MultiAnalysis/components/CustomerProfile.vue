<script setup lang="ts">
import { computed, ref } from 'vue';
import ChartPanel from '../../../components/common/ChartPanel.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { groupRows, fmt } from '../../../utils/metrics';
import { donutOption } from '../../../charts/options';
import type { CustomerProfileMetric } from '../../../types';
const store = useDashboardStore();
const dimension = ref<'customer' | 'channel' | 'property' | 'area'>('customer');
const groups = computed(() => groupRows(store.filtered, dimension.value));
const profiles = computed<CustomerProfileMetric[]>(() =>
  groups.value.map((r) => ({
    name: r.name,
    value: r.leads,
    amount: r.amount,
    conversion: r.conversion,
  })),
);
const option = computed(() => donutOption(groups.value));
</script>
<template>
  <div class="panel profile-panel">
    <ChartPanel
      class="nested-chart"
      title="客户结构分析"
      subtitle="客户分布、成交贡献与转化差异"
      :option="option"
      :height="185"
      unit="组"
      @select="
        (name) =>
          store.drill(
            name + ' · 客户结构',
            store.filtered.filter((r) => r[dimension] === name),
          )
      "
      ><template #tools
        ><el-select v-model="dimension" size="small" class="chart-select" aria-label="客户结构维度"
          ><el-option label="客户类型" value="customer" /><el-option
            label="来源渠道"
            value="channel" /><el-option label="意向业态" value="property" /><el-option
            label="意向面积"
            value="area" /></el-select></template
    ></ChartPanel>
    <div class="profile-list">
      <div class="profile-list-head">
        <span>客群 / 来源</span><span>成交贡献（万元）</span><span>转化率</span>
      </div>
      <button
        v-for="p in profiles"
        :key="p.name"
        @click="
          store.drill(
            p.name + ' · 客群明细',
            store.filtered.filter((r) => r[dimension] === p.name),
          )
        "
      >
        <span>{{ p.name }}</span
        ><strong>{{ fmt(p.amount) }}</strong
        ><span class="positive">{{ fmt(p.conversion, 1) }}%</span>
      </button>
    </div>
  </div>
</template>
