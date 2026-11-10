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
    hoverOnlyAxisPointer?: boolean;
    highlightName?: string;
    highlightTooltip?: boolean;
    pinnedTooltip?: { seriesId: string; dataIndex: number };
  }>(),
  { loading: false, empty: false, error: '', height: 190, unit: '', transition: false },
);
const emit = defineEmits<{ select: [name: string]; hover: [name: string]; leave: []; retry: [] }>();
const host = ref<HTMLDivElement>();
let chart: echarts.ECharts | undefined;
let observer: ResizeObserver | undefined;
let tooltipTimer: ReturnType<typeof setTimeout> | undefined;
let hadPinnedTooltip = false;
let hoveredBubbleTarget: unknown;
function syncHighlight() {
  if (props.highlightName === undefined) return;
  chart?.dispatchAction({ type: 'downplay' });
  if (props.highlightName) chart?.dispatchAction({ type: 'highlight', name: props.highlightName });
  if (props.highlightTooltip) {
    const series = Array.isArray(props.option.series) ? props.option.series : [props.option.series];
    const seriesIndex = series.findIndex((item) => item?.type === 'pie');
    const data = seriesIndex >= 0 ? series[seriesIndex]?.data : [];
    const dataIndex = Array.isArray(data)
      ? data.findIndex(
          (item) =>
            item && typeof item === 'object' && 'name' in item && item.name === props.highlightName,
        )
      : -1;
    chart?.dispatchAction(
      dataIndex >= 0 ? { type: 'showTip', seriesIndex, dataIndex } : { type: 'hideTip' },
    );
  }
}
function updateHoverPointer(trigger: 'mousemove' | 'leave', x?: number, y?: number) {
  chart?.dispatchAction({
    type: 'updateAxisPointer',
    currTrigger: trigger,
    x,
    y,
    // 十字线只负责定位，提示框继续由气泡悬停和固定提示逻辑管理。
    dispatchAction: (action: { type: string }) => {
      if (action.type !== 'hideTip' && action.type !== 'showTip') chart?.dispatchAction(action);
    },
  });
}
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
    chart.on('mouseover', (params) => emit('hover', params.name));
    chart.on('mousemove', (params) => {
      if (!props.hoverOnlyAxisPointer) return;
      const event = params.event;
      if (params.seriesType === 'scatter' && params.data && event) {
        hoveredBubbleTarget = event.target;
        updateHoverPointer('mousemove', event.offsetX, event.offsetY);
      }
    });
    // 点击会重建气泡系列，旧图形不一定再触发 mouseout；同时检查画布的实际命中对象。
    chart.getZr().on('mousemove', (event) => {
      if (props.hoverOnlyAxisPointer && (!event.target || event.target !== hoveredBubbleTarget)) {
        hoveredBubbleTarget = undefined;
        updateHoverPointer('leave');
      }
    });
    chart.on('mouseout', () => {
      emit('leave');
      hoveredBubbleTarget = undefined;
      if (props.hoverOnlyAxisPointer) updateHoverPointer('leave');
    });
    chart.getZr().on('globalout', () => {
      emit('leave');
      hoveredBubbleTarget = undefined;
      if (props.hoverOnlyAxisPointer) updateHoverPointer('leave');
    });
  }
  if (tooltipTimer !== undefined) {
    clearTimeout(tooltipTimer);
    tooltipTimer = undefined;
  }
  // 清除上一次定位，等待本次位置动画完成后再显示，避免新数据配上旧坐标。
  if (props.pinnedTooltip || hadPinnedTooltip) {
    // 固定提示会忽略 hideTip；先解除固定和可进入状态，才能真正清除旧提示框。
    chart.setOption({ tooltip: { alwaysShowContent: false, enterable: false, hideDelay: 0 } });
    chart.dispatchAction({ type: 'hideTip' });
  }
  const configured = configureChartTooltip(props.option, host.value!);
  const deferTooltip = props.transition && !!props.pinnedTooltip;
  const option =
    deferTooltip && configured.tooltip && !Array.isArray(configured.tooltip)
      ? { ...configured, tooltip: { ...configured.tooltip, show: false } }
      : configured;
  chart.setOption(
    props.hoverOnlyAxisPointer ? { ...option, axisPointer: { triggerOn: 'none' } } : option,
    {
      notMerge: !props.transition,
      ...(props.transition ? { replaceMerge: ['series'] } : {}),
    },
  );
  chart.resize();
  if (props.hoverOnlyAxisPointer) {
    // 系列更新会复用旧气泡图形；清除继承的悬浮高亮及其他气泡的 blur 状态。
    chart.dispatchAction({ type: 'downplay' });
    hoveredBubbleTarget = undefined;
    updateHoverPointer('leave');
  }
  syncHighlight();
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
watch(() => props.highlightName, syncHighlight);
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
