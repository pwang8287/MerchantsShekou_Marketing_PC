<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
const props = withDefaults(
  defineProps<{
    option: EChartsOption;
    loading?: boolean;
    empty?: boolean;
    error?: string;
    height?: number;
    unit?: string;
  }>(),
  { loading: false, empty: false, error: '', height: 190, unit: '' },
);
const emit = defineEmits<{ select: [name: string]; retry: [] }>();
const host = ref<HTMLDivElement>();
let chart: echarts.ECharts | undefined;
let observer: ResizeObserver | undefined;
function render() {
  if (!host.value) return;
  if (!chart) {
    chart = echarts.init(host.value);
    chart.on('click', (params) => emit('select', params.name));
  }
  chart.setOption(props.option, true);
  chart.resize();
}
onMounted(() => {
  render();
  observer = new ResizeObserver(() => chart?.resize());
  if (host.value) observer.observe(host.value);
});
watch(
  () => props.option,
  () => nextTick(render),
  { deep: true },
);
onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
});
function reset() {
  chart?.dispatchAction({ type: 'restore' });
  chart?.setOption(props.option, true);
}
function download(includeLegend = false) {
  if (!chart) return;
  // 渠道页使用可操作的 HTML 图例；导出图片时补入相同颜色的图表图例。
  if (includeLegend)
    chart.setOption({ animation: false, legend: { show: true }, grid: { top: 65 } });
  try {
    const a = document.createElement('a');
    a.href = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    a.download = '营销分析图表.png';
    a.click();
  } finally {
    if (includeLegend) chart.setOption(props.option, true);
  }
}
defineExpose({ reset, download });
</script>
<template>
  <div class="chart-root" v-loading="loading" :style="{ height: height + 'px' }">
    <div
      ref="host"
      :style="{ height: '100%', width: '100%', visibility: empty || error ? 'hidden' : 'visible' }"
      role="img"
      :aria-label="'交互分析图表，单位：' + unit"
    ></div>
    <div v-if="empty || error" class="chart-state">
      <el-empty v-if="empty" :image-size="45" description="当前条件暂无数据" />
      <div v-else>
        {{ error }} <el-button link type="primary" @click="emit('retry')">重试</el-button>
      </div>
    </div>
  </div>
</template>
