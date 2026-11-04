<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import type { KpiMetric } from '../../types';
import type { KpiTrendContext } from '../../utils/kpiTrend';
import { useDashboardStore } from '../../stores/dashboard';
import KpiTrendPanel from './KpiTrendPanel.vue';
import { statisticsPeriodPrefix } from '../../utils/statisticsPeriod';
import { kpiColor } from '../../utils/kpiColors';
const props = defineProps<{ metric: KpiMetric; mode: 'yesterday' | 'cumulative' }>();
const store = useDashboardStore();
const owner = `kpi-trend-${getCurrentInstance()!.uid}`;
const triggerButton = ref<HTMLButtonElement>();
const visible = computed(() => store.activeKpiTrend === owner);
const context = shallowRef<KpiTrendContext | null>(null);
const accentColor = computed(() => kpiColor(props.metric.key));
const viewport = ref({ width: window.innerWidth, height: window.innerHeight });
const width = computed(() => Math.min(760, viewport.value.width - 32));
const chartHeight = computed(() => Math.max(160, Math.min(240, viewport.value.height - 200)));
const disabled = computed(() => store.loading || !!store.error || !store.rows.length);
function resize() {
  viewport.value = { width: window.innerWidth, height: window.innerHeight };
}
function open() {
  if (!disabled.value) store.activeKpiTrend = owner;
}
function close() {
  if (visible.value) store.activeKpiTrend = '';
}
function onPageClick(event: MouseEvent) {
  if (!visible.value) return;
  if (triggerButton.value && event.composedPath().includes(triggerButton.value)) return;
  const popper =
    event.target instanceof Element ? event.target.closest('.kpi-trend-popover') : null;
  if (popper?.querySelector(`[data-kpi-trend-owner="${owner}"]`)) return;
  close();
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close();
}
onMounted(() => {
  window.addEventListener('resize', resize);
  document.addEventListener('click', onPageClick, true);
  document.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  document.removeEventListener('click', onPageClick, true);
  document.removeEventListener('keydown', onKeydown);
  close();
});
function prepare() {
  context.value = {
    key: props.metric.key,
    mode: props.mode,
    filter: JSON.parse(JSON.stringify(store.filter)),
    rows: store.rows,
  };
}
const popperOptions = {
  strategy: 'fixed' as const,
  modifiers: [
    {
      name: 'preventOverflow',
      options: { boundary: 'viewport', rootBoundary: 'viewport', padding: 16, altAxis: true },
    },
    {
      name: 'flip',
      options: { fallbackPlacements: ['top-start', 'bottom-end', 'top-end'], padding: 16 },
    },
  ],
};
</script>
<template>
  <el-popover
    :visible="visible"
    trigger="click"
    placement="bottom-start"
    :width="width"
    :offset="12"
    :show-arrow="false"
    :enterable="true"
    :teleported="true"
    :persistent="false"
    :disabled="disabled"
    :popper-options="popperOptions"
    popper-class="kpi-trend-popover"
    @before-enter="prepare"
  >
    <template #reference
      ><button
        ref="triggerButton"
        class="kpi-trend-button"
        :aria-expanded="visible"
        :disabled="disabled"
        :aria-label="`${mode === 'yesterday' ? '昨日' : statisticsPeriodPrefix(store.filter.periodType)}${metric.label}趋势`"
        @click="open"
      >
        <span class="kpi-trend-arrow">↗</span>
      </button></template
    >
    <div :data-kpi-trend-owner="owner">
      <KpiTrendPanel
        v-if="context"
        :context="context"
        :chart-height="chartHeight"
        :accent-color="accentColor"
      />
    </div>
  </el-popover>
</template>
<style scoped>
.kpi-trend-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 22px;
  height: 22px;
  border: 0;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
}
.kpi-trend-button:hover {
  background: #eaf2ff;
}
.kpi-trend-button:focus-visible {
  outline: 2px solid #1677ff;
  outline-offset: 2px;
}
.kpi-trend-button:disabled {
  opacity: 0.4;
  cursor: default;
}
.kpi-trend-arrow {
  margin: 0;
  color: var(--kpi-accent);
}
</style>
<style>
.el-popover.el-popper.kpi-trend-popover {
  padding: 0;
  border: 1px solid #dfe7f3;
  border-radius: 12px;
  box-shadow: 0 18px 48px #10233f29;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  overflow: auto;
  box-sizing: border-box;
}
</style>
