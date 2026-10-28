<script setup lang="ts">
import { computed, ref } from 'vue';
import type { EChartsOption } from 'echarts';
import { Download, RefreshRight } from '@element-plus/icons-vue';
import { withContext } from '../../charts/options/tooltip';
import BaseChart from '../../charts/components/BaseChart.vue';
import { useDashboardStore } from '../../stores/dashboard';
const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    option: EChartsOption;
    height?: number;
    unit?: string;
  }>(),
  { subtitle: '', height: 210, unit: '' },
);
const emit = defineEmits<{ select: [name: string] }>();
const chart = ref<InstanceType<typeof BaseChart>>();
const store = useDashboardStore();
const contextualOption = computed(() =>
  withContext(props.option, store.rows, store.filter, props.unit, props.subtitle),
);
</script>
<template>
  <section class="panel chart-panel">
    <header class="panel-head">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="chart-tools">
        <slot name="tools" /><el-button
          text
          :icon="RefreshRight"
          aria-label="重置图表"
          title="重置图表"
          @click="chart?.reset()"
        /><el-button
          text
          :icon="Download"
          aria-label="下载图表"
          title="下载图表"
          @click="chart?.download()"
        />
      </div>
    </header>
    <slot name="above-chart" />
    <BaseChart
      ref="chart"
      :option="contextualOption"
      :height="height"
      :unit="unit"
      :empty="!store.filtered.length"
      :loading="store.loading"
      @select="emit('select', $event)"
    />
  </section>
</template>
