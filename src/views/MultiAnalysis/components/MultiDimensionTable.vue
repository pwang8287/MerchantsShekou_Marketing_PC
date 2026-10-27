<script setup lang="ts">
import { computed } from 'vue';
import MetricTable from '../../../components/tables/MetricTable.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { groupRows, dimensions } from '../../../utils/metrics';
import type { Dimension } from '../../../types';
const props = defineProps<{ dimension: Dimension }>();
const store = useDashboardStore();
const rows = computed(() => groupRows(store.filtered, props.dimension));
</script>
<template>
  <MetricTable
    title="多维分析明细"
    :name-label="dimensions[dimension]"
    :rows="rows"
    :metrics="[
      'amount',
      'contracts',
      'collection',
      'completion',
      'conversion',
      'acquisition',
      'roi',
    ]"
  />
</template>
