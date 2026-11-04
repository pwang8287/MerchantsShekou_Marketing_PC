<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { configureChartTooltip } from '../options/donutTooltip';
const props = withDefaults(
  defineProps<{
    option: EChartsOption;
    loading?: boolean;
    empty?: boolean;
    error?: string;
    height?: number;
    unit?: string;
    transition?: boolean;
    pinnedTooltip?: { seriesId: string; dataIndex: number };
  }>(),
  { loading: false, empty: false, error: '', height: 190, unit: '', transition: false },
);
const emit = defineEmits<{ select: [name: string]; retry: [] }>();
const host = ref<HTMLDivElement>();
let chart: echarts.ECharts | undefined;
let observer: ResizeObserver | undefined;
let tooltipTimer: ReturnType<typeof setTimeout> | undefined;
let hadPinnedTooltip = false;
function showPinnedTooltip() {
  if (!chart || !props.pinnedTooltip) return;
  const series = Array.isArray(props.option.series) ? props.option.series : [props.option.series];
  const seriesIndex = series.findIndex((item) => item?.id === props.pinnedTooltip?.seriesId);
  if (seriesIndex >= 0)
    chart.dispatchAction({
      type: 'showTip',
      seriesIndex,
      dataIndex: props.pinnedTooltip.dataIndex,
    });
}
function render() {
  if (!host.value) return;
  if (!chart) {
    chart = echarts.init(host.value);
    chart.on('click', (params) => emit('select', params.name));
  }
  if (tooltipTimer !== undefined) {
    clearTimeout(tooltipTimer);
    tooltipTimer = undefined;
  }
  // 清除上一次定位，等待本次位置动画完成后再显示，避免新数据配上旧坐标。
  if (props.pinnedTooltip || hadPinnedTooltip) chart.dispatchAction({ type: 'hideTip' });
  const configured = configureChartTooltip(props.option, host.value!);
  const deferTooltip = props.transition && !!props.pinnedTooltip;
  const option =
    deferTooltip && configured.tooltip && !Array.isArray(configured.tooltip)
      ? { ...configured, tooltip: { ...configured.tooltip, show: false } }
      : configured;
  chart.setOption(option, {
    notMerge: !props.transition,
    ...(props.transition ? { replaceMerge: ['series'] } : {}),
  });
  chart.resize();
  if (props.pinnedTooltip) {
    hadPinnedTooltip = true;
    const duration = props.option.animationDurationUpdate;
    const delay = props.transition ? (typeof duration === 'number' ? duration : 800) + 50 : 0;
    tooltipTimer = setTimeout(() => {
      tooltipTimer = undefined;
      if (deferTooltip && chart && props.pinnedTooltip && configured.tooltip) {
        chart.setOption({ tooltip: configured.tooltip });
      }
      showPinnedTooltip();
    }, delay);
  } else if (hadPinnedTooltip) {
    hadPinnedTooltip = false;
  }
}
onMounted(() => {
  render();
  observer = new ResizeObserver(() => {
    chart?.resize();
    if (tooltipTimer === undefined) showPinnedTooltip();
  });
  if (host.value) observer.observe(host.value);
});
watch([() => props.option, () => props.pinnedTooltip], () => nextTick(render), { deep: true });
onBeforeUnmount(() => {
  if (tooltipTimer !== undefined) clearTimeout(tooltipTimer);
  observer?.disconnect();
  chart?.dispose();
});
function reset() {
  chart?.dispatchAction({ type: 'restore' });
  chart?.setOption(configureChartTooltip(props.option, host.value!), true);
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
    if (includeLegend) chart.setOption(configureChartTooltip(props.option, host.value!), true);
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
