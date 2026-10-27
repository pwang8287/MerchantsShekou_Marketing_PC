<script setup lang="ts">
import { computed } from 'vue';
import MetricTable from '../../../components/tables/MetricTable.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { groupRows } from '../../../utils/metrics';
const store = useDashboardStore();
const rows = computed(() => groupRows(store.filtered, 'project'));
</script>
<template>
  <MetricTable
    :rows="rows"
    :metrics="[
      'target',
      'amount',
      'completion',
      'collection',
      'leads',
      'visits',
      'subscriptions',
      'contracts',
      'conversion',
    ]"
  />
</template>
