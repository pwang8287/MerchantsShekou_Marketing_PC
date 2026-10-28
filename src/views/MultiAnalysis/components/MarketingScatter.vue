<script setup lang="ts">
import { computed, ref } from 'vue';
import ChartPanel from '../../../components/common/ChartPanel.vue';
import BubbleSizeSelector from '../../../components/common/BubbleSizeSelector.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { groupRows } from '../../../utils/metrics';
import { scatterOption } from '../../../charts/options';
import type { BubbleSizeMetric } from '../../../utils/dealCycle';
import type { Dimension } from '../../../types';
const props = defineProps<{ dimension: Dimension }>();
const store = useDashboardStore();
const sizeMetric = ref<BubbleSizeMetric>('current');
const option = computed(() =>
  scatterOption(groupRows(store.filtered, props.dimension), sizeMetric.value),
);
</script>
<template>
  <ChartPanel
    title="获客成本 × 签约转化率"
    :subtitle="
      sizeMetric === 'cycle'
        ? '气泡大小代表成交周期（模拟，天）· 首次留资至签约，按签约套数加权；越长越大'
        : '气泡大小代表签约金额 · 越靠左上，获客效率越高'
    "
    :option="option"
    :height="320"
    unit="元/套 · %"
    @select="
      (name) =>
        store.drill(
          name + ' · 转化效率',
          store.filtered.filter((r) => r[dimension] === name),
        )
    "
    ><template #above-chart
      ><BubbleSizeSelector v-model="sizeMetric" current-label="签约金额"
    /></template>
  </ChartPanel>
</template>
