<script setup lang="ts">
import { computed } from 'vue';
import ChartPanel from '../../../components/common/ChartPanel.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { groupRows } from '../../../utils/metrics';
import { scatterOption } from '../../../charts/options';
import type { Dimension } from '../../../types';
const props = defineProps<{ dimension: Dimension }>();
const store = useDashboardStore();
const option = computed(() => scatterOption(groupRows(store.filtered, props.dimension)));
</script>
<template>
  <ChartPanel
    title="获客成本 × 签约转化率"
    subtitle="气泡大小代表签约金额 · 越靠左上，获客效率越高"
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
  />
</template>
