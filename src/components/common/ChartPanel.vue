<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import { withContext } from '../../charts/options/tooltip';
import BaseChart from '../../charts/components/BaseChart.vue';
import { useDashboardStore } from '../../stores/dashboard';
import type { DashboardFilter } from '../../types';
import { filterRows } from '../../utils/metrics';
const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    option: EChartsOption;
    height?: number;
    unit?: string;
    filter?: DashboardFilter;
    contextualTooltip?: boolean;
  }>(),
  { subtitle: '', height: 210, unit: '', contextualTooltip: true },
);
const emit = defineEmits<{ select: [name: string] }>();
const store = useDashboardStore();
const contextualOption = computed(() =>
  props.contextualTooltip
    ? withContext(
        props.option,
        store.rows,
        props.filter || store.filter,
        props.unit,
        props.subtitle,
      )
    : props.option,
);
const hasData = computed(() =>
  props.filter ? filterRows(store.rows, props.filter).length > 0 : store.filtered.length > 0,
);
</script>
<template>
  <section class="panel chart-panel">
    <header class="panel-head">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.tools" class="chart-tools"><slot name="tools" /></div>
    </header>
    <slot name="above-chart" />
    <BaseChart
      :option="contextualOption"
      :height="height"
      :unit="unit"
      :empty="!hasData"
      :loading="store.loading"
      @select="emit('select', $event)"
    />
  </section>
</template>
