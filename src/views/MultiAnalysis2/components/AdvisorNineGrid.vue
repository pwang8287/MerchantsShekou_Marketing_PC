<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import type { EChartsOption, LineSeriesOption, ScatterSeriesOption } from 'echarts';
import type { DashboardFilter, MarketingPerformanceMetric } from '../../../types';
import type { GridPoint } from '../../../types/nineGrid';
import BaseChart from '../../../charts/components/BaseChart.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import {
  buildAdvisorReceptionMatrix,
  buildReceptionHistory,
} from '../../../utils/advisorReceptionMatrix';
import { formatStatisticsPeriod } from '../../../utils/statisticsPeriod';
import { fmt } from '../../../utils/metrics';
import { matrixReplayPoints } from '../../../utils/matrixReplay';
import type { BubbleSizeMetric } from '../../../utils/dealCycle';
const props = withDefaults(
  defineProps<{
    rows: MarketingPerformanceMetric[];
    filter?: DashboardFilter;
    dimension?: 'advisor' | 'project';
    size?: BubbleSizeMetric | 'contracts';
    selectedProject?: string;
    search?: string;
    cityColors?: Record<string, string>;
  }>(),
  {
    dimension: 'advisor',
    size: 'current',
    selectedProject: '',
    search: '',
    cityColors: () => ({}),
  },
);
const emit = defineEmits<{ (event: 'project-select', project: string): void }>();
const projectMode = computed(() => props.dimension === 'project');
const entityLabel = computed(() => (projectMode.value ? '项目' : '顾问'));
const store = useDashboardStore();
const analysisFilter = computed(() => props.filter || store.filter);
const size = computed(() => props.size);
const sizeLabel = computed(() =>
  size.value === 'contracts' ? '签约套数' : size.value === 'cycle' ? '成交周期' : '签约金额',
);
const sizeValue = (point: GridPoint) =>
  size.value === 'contracts'
    ? point.current.contracts
    : size.value === 'cycle'
      ? (point.dealCycle ?? 0)
      : point.current.amount;
const selectedName = ref('');
const pointCity = (point: GridPoint) => point.records[0]?.city || '未分配城市';
const color = (city: string) => props.cityColors[city] || '#486DE6';
function transparentColor(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}
const historyMonths = ref(6);
const frameIndex = ref(5);
const playing = ref(false);
let playbackTimer: ReturnType<typeof setInterval> | undefined;
const monthlyMode = computed(() => analysisFilter.value.periodType === 'month');
const history = computed(() => {
  if (monthlyMode.value)
    return buildReceptionHistory(
      props.rows,
      analysisFilter.value,
      props.dimension,
      historyMonths.value,
    );
  const filter = analysisFilter.value;
  return [
    {
      month: formatStatisticsPeriod(filter),
      start: filter.metricDateRange?.[0] || filter.period[0] + '-01',
      end: filter.metricDateRange?.[1] || filter.metricDate || filter.period[1] + '-01',
      result: buildAdvisorReceptionMatrix(props.rows, filter, props.dimension),
    },
  ];
});
const currentFrame = computed(
  () => history.value[frameIndex.value] || history.value[history.value.length - 1],
);
const endFrame = computed(() => history.value[history.value.length - 1]);
const result = computed(() => endFrame.value.result);
function pause() {
  if (playbackTimer !== undefined) clearInterval(playbackTimer);
  playbackTimer = undefined;
  playing.value = false;
}
function togglePlayback() {
  if (playing.value) {
    pause();
    return;
  }
  if (!selectedName.value) return;
  if (frameIndex.value >= historyMonths.value - 1) frameIndex.value = 0;
  playing.value = true;
  playbackTimer = setInterval(() => {
    frameIndex.value++;
    if (frameIndex.value >= historyMonths.value - 1) pause();
  }, 1200);
}
const temporalLabel = (index: number) =>
  index === historyMonths.value - 1 ? '当月' : `T-${historyMonths.value - 1 - index}`;
watch(historyMonths, () => {
  pause();
  frameIndex.value = historyMonths.value - 1;
});
watch([() => props.rows, analysisFilter], () => {
  pause();
  frameIndex.value = historyMonths.value - 1;
  selectedName.value = '';
});
onBeforeUnmount(pause);
const selectedHistory = computed(() =>
  history.value.map((frame) => ({
    ...frame,
    point: frame.result.points.find((point) => point.name === selectedName.value),
  })),
);
const shown = computed(() =>
  result.value.points.filter(
    (point) => projectMode.value || !props.selectedProject || point.group === props.selectedProject,
  ),
);
const replayPoints = computed(() =>
  matrixReplayPoints(shown.value, currentFrame.value.result.points, selectedName.value),
);
const filtered = computed(() =>
  shown.value.filter((point) =>
    point.group.toLowerCase().includes(props.search.trim().toLowerCase()),
  ),
);
function select(name: string) {
  const point = shown.value.find((point) => point.name === name);
  if (name === selectedName.value || point) {
    selectedName.value = selectedName.value === name ? '' : name;
    if (projectMode.value) emit('project-select', selectedName.value ? point?.group || name : '');
  }
}
watch(
  () => props.selectedProject,
  () => {
    pause();
    selectedName.value = projectMode.value ? props.selectedProject : '';
  },
);
function position(value: number, boundaries: number[]) {
  const band = value < boundaries[1] ? 0 : value > boundaries[2] ? 2 : 1;
  return band + (value - boundaries[band]) / (boundaries[band + 1] - boundaries[band]);
}
const option = computed<EChartsOption>(() => {
  const x = result.value.xEdges;
  const y = result.value.yEdges;
  const max = Math.max(1, ...result.value.points.map((p) => sizeValue(p)));
  const trajectory: (LineSeriesOption | ScatterSeriesOption)[] = [];
  if (selectedName.value) {
    const trail = selectedHistory.value;
    const referencePoint = trail.find((item) => item.point)?.point;
    const trailColor = referencePoint ? color(pointCity(referencePoint)) : '#4f8eff';
    const coordinate = (point: GridPoint | undefined) =>
      point ? [position(point.x, x), position(point.y, y)] : ['-', '-'];
    trajectory.push(
      {
        type: 'line',
        id: 'past-trail',
        silent: true,
        connectNulls: false,
        symbol: 'none',
        lineStyle: { color: trailColor, width: 2, type: 'dashed' },
        z: 1,
        data: trail.map((item, index) => ({
          value: coordinate(index <= frameIndex.value ? item.point : undefined),
        })),
      },
      {
        type: 'scatter',
        id: 'history-points',
        z: 8,
        symbolSize: 7,
        data: trail.flatMap((item, index) =>
          item.point && index < frameIndex.value
            ? [
                {
                  name: item.point.name,
                  point: { ...item.point, records: [] },
                  month: item.month,
                  days: item.result.days,
                  value: coordinate(item.point),
                  symbolSize: 7,
                  itemStyle: {
                    color: trailColor,
                    borderColor: '#fff',
                    borderWidth: 0,
                  },
                  label: {
                    show: true,
                    formatter: temporalLabel(index),
                    position: index % 2 ? ('bottom' as const) : ('top' as const),
                    color: trailColor,
                    fontSize: 9,
                    distance: 7,
                    hideOverlap: true,
                  },
                },
              ]
            : [],
        ),
      },
    );
  }
  const tones = { good: '#F1FAF6', risk: '#FFF5F7', neutral: '#FDFBF2' };
  return {
    animationDurationUpdate: 800,
    animationEasingUpdate: 'cubicInOut',
    tooltip: {
      trigger: 'item',
      show: !playing.value,
      triggerOn: playing.value ? 'none' : 'mousemove',
      alwaysShowContent: false,
      enterable: false,
      appendToBody: true,
      confine: true,
      transitionDuration: 0,
      hideDelay: 0,
      position: (point, _params, _dom, _rect, chartSize) => {
        const [width, height] = chartSize.contentSize;
        const [viewWidth, viewHeight] = chartSize.viewSize;
        const left = point[0] + width + 16 < viewWidth ? point[0] + 12 : point[0] - width - 12;
        // 留出底部坐标及回放控制区域，低位气泡的提示框向上避让。
        return [
          Math.max(8, Math.min(left, viewWidth - width - 8)),
          Math.max(8, Math.min(point[1] + 12, viewHeight - height - 84)),
        ];
      },
      axisPointer: {
        type: 'cross',
        crossStyle: { color: '#D5DDE8', type: 'dashed', width: 1 },
        label: { show: false },
      },
      backgroundColor: '#fff',
      borderColor: '#dfe7f1',
      borderWidth: 1,
      padding: 12,
      extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(28,48,76,.12);',
      textStyle: { fontSize: 12, color: '#43546e' },
      formatter: (raw: unknown) => {
        const data = (raw as { data?: { point?: GridPoint; month?: string; days?: number } }).data;
        const point = data?.point;
        if (!point) return '';
        const name = point.name.replace(
          /[&<>"']/g,
          (char) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
        );
        const row = (label: string, value: string, highlight = false) =>
          `<div style="display:flex;justify-content:space-between;gap:20px;line-height:24px"><span style="color:#7b8aa3">${label}</span><span style="color:${highlight ? '#1677ff' : '#26394f'};font-weight:${highlight ? 600 : 400}">${value}</span></div>`;
        const divider = '<div style="border-top:1px solid #edf1f7;margin:8px 0"></div>';
        return `<div style="min-width:250px"><div style="display:flex;justify-content:flex-end;margin-bottom:8px"><span style="padding:1px 6px;border:1px solid #e4eaf3;border-radius:4px;color:#7b8aa3;font-size:11px">气泡大小：${sizeLabel.value}</span></div><b style="color:#26394f">${name}</b>${row('统计周期', data?.month || currentFrame.value.month)}${divider}${row('接待人数', fmt(point.current.visitPeople) + ' 人')}${row('日均接待人数', fmt(point.y, 2) + ' 人/日')}${row('到访至签约转化率', fmt(point.x, 2) + '%', true)}${divider}${row('签约套数', fmt(point.current.contracts) + ' 套')}${row('签约金额', fmt(point.current.amount, 2) + ' 万元')}${size.value === 'cycle' ? row('平均成交周期', point.dealCycle == null ? '—' : fmt(point.dealCycle, 1) + ' 天') : ''}${divider}${row('所属区域', point.cell.name, true)}</div>`;
      },
    },
    grid: { left: 76, right: 28, top: 38, bottom: 76 },
    xAxis: {
      type: 'value',
      z: 10,
      min: 0,
      max: 3,
      interval: 1,
      axisLabel: {
        formatter: (v: number) => fmt(x[Math.round(v)], 1) + '%',
        fontSize: 11,
        color: '#71809a',
      },
      axisLine: { show: true, lineStyle: { color: '#666666', type: 'solid', width: 1 } },
      axisTick: { show: true, length: 6, lineStyle: { color: '#666666', width: 1 } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      z: 10,
      position: 'left',
      min: 0,
      max: 3,
      interval: 1,
      name: 'Y · 日均接待人数（人/日）',
      nameTextStyle: {
        align: 'left',
        padding: [0, 0, 0, -54],
        fontSize: 11,
        fontWeight: 700,
        color: '#1c2b37',
      },
      axisLabel: {
        formatter: (v: number) => fmt(y[Math.round(v)], 2),
        fontSize: 11,
        color: '#71809a',
      },
      axisLine: { show: true, lineStyle: { color: '#666666', type: 'solid', width: 1 } },
      axisTick: { show: true, length: 6, lineStyle: { color: '#666666', width: 1 } },
      splitLine: { show: false },
    },
    series: [
      {
        type: 'scatter',
        id: 'matrix-background',
        silent: true,
        z: 0,
        data: [],
        markArea: {
          z: 0,
          silent: true,
          label: { show: true, position: 'insideTopLeft', fontSize: 10, padding: [8, 5] },
          data: result.value.cells.map((cell) => [
            {
              name: cell.name,
              xAxis: cell.col,
              yAxis: 2 - cell.row,
              itemStyle: { color: tones[cell.tone] },
              label: {
                color:
                  cell.tone === 'good' ? '#00C48C' : cell.tone === 'risk' ? '#FF527B' : '#F5B900',
              },
            },
            { xAxis: cell.col + 1, yAxis: 3 - cell.row },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: '#9dafc9', type: 'dashed', width: 1 },
          data: [{ xAxis: 1 }, { xAxis: 2 }, { yAxis: 1 }, { yAxis: 2 }],
        },
      },
      {
        type: 'scatter',
        id: 'current-bubbles',
        z: 5,
        symbolSize: (value: number[]) => Math.sqrt(value[2] / max) * 46 + 5,
        emphasis: {
          scale: 1.12,
          focus: 'self',
          blurScope: 'series',
          itemStyle: { opacity: 1, borderWidth: 2 },
        },
        blur: { itemStyle: { opacity: 1 } },
        data: replayPoints.value.map((point) => ({
          id: point.name,
          name: point.name,
          point: { ...point, records: [] },
          month:
            point.name === selectedName.value ? currentFrame.value.month : endFrame.value.month,
          days:
            point.name === selectedName.value ? currentFrame.value.result.days : result.value.days,
          symbolSize:
            point.name === selectedName.value && frameIndex.value < historyMonths.value - 1
              ? 9
              : Math.sqrt(sizeValue(point) / max) * 46 + 5,
          label: {
            show: point.name === selectedName.value && frameIndex.value < historyMonths.value - 1,
            formatter: temporalLabel(frameIndex.value),
            position: 'top',
            color: color(pointCity(point)),
            fontSize: 10,
          },
          value: [position(point.x, x), position(point.y, y), sizeValue(point)],
          itemStyle: {
            color: transparentColor(
              color(pointCity(point)),
              props.search && !filtered.value.some((item) => item.name === point.name)
                ? 0.08
                : selectedName.value && selectedName.value !== point.name
                  ? 0.3
                  : selectedName.value === point.name
                    ? 1
                    : 0.9,
            ),
            opacity: 1,
            borderColor: selectedName.value === point.name ? color(pointCity(point)) : '#fff',
            borderWidth: selectedName.value === point.name ? 3 : 1,
          },
          emphasis: {
            itemStyle: { color: color(pointCity(point)), opacity: 1 },
          },
          blur: {
            itemStyle: {
              color: transparentColor(color(pointCity(point)), 0.3),
              opacity: 1,
              borderColor: '#fff',
              borderWidth: 1,
            },
          },
        })),
      },
      ...trajectory,
    ],
  };
});
</script>
<template>
  <section class="advisor-matrix">
    <header class="matrix-head">
      <h2>{{ entityLabel }}接待效率与转化九宫格分析</h2>
      <p>
        横轴为到访至签约转化率，纵轴为日均接待人数。每个气泡代表一个{{
          entityLabel
        }}，颜色区分所属城市，通过右侧共用项目列表进行筛选。<template v-if="monthlyMode"
          >点击气泡查看历史位置轨迹。</template
        >
      </p>
    </header>
    <div class="matrix-body">
      <div class="matrix-plot">
        <BaseChart
          :option="option"
          transition
          hover-only-axis-pointer
          :height="520"
          :loading="store.loading"
          :empty="!shown.length && !selectedHistory.some((item) => item.point)"
          @select="select"
        />
        <div class="matrix-x-title">X · 到访至签约转化率（%）</div>
      </div>
    </div>
    <div v-if="monthlyMode" class="matrix-timeline">
      <button
        class="timeline-play"
        :aria-label="playing ? '暂停月度回放' : '播放月度回放'"
        :aria-pressed="playing"
        :disabled="!selectedName"
        :title="selectedName ? '播放选中气泡的位置变化' : '请先点击一个气泡'"
        @click="togglePlayback"
      >
        <svg
          v-if="!selectedName"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 5.5C8 4.7 8.9 4.2 9.6 4.6L19 10.5C20.1 11.2 20.1 12.8 19 13.5L9.6 19.4C8.9 19.8 8 19.3 8 18.5V5.5Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
        <template v-else>{{ playing ? 'Ⅱ' : '▶' }}</template>
      </button>
      <div class="timeline-track">
        <el-slider
          v-model="frameIndex"
          :min="0"
          :max="historyMonths - 1"
          :step="1"
          :show-tooltip="true"
          :format-tooltip="(index: number) => history[index]?.month || ''"
          aria-label="月度回放进度"
          @input="pause"
        />
        <div class="timeline-labels">
          <button
            v-for="(_, index) in history"
            :key="index"
            :class="{ current: frameIndex === index }"
            :title="history[index].month"
            @click="
              pause();
              frameIndex = index;
            "
          >
            {{ temporalLabel(index) }}
          </button>
        </div>
      </div>
      <div class="timeline-options">
        <div class="timeline-periods segmented-selector">
          <button
            v-for="item in [
              { value: 3, label: '3个月' },
              { value: 6, label: '6个月' },
              { value: 12, label: '1年' },
            ]"
            :key="item.value"
            :class="{ active: historyMonths === item.value }"
            :aria-pressed="historyMonths === item.value"
            @click="historyMonths = item.value"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.advisor-matrix {
  margin-bottom: 18px;
  padding: 22px 24px 12px;
  background: #fff;
  border: 1px solid #dfe7f1;
  border-radius: 10px;
  box-shadow: 0 1px 3px #1e293b06;
  color: #263445;
}
.matrix-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.5;
}
.matrix-head p {
  color: #738194;
  font-size: 12px;
  line-height: 1.9;
  margin: 5px 0 19px;
}
.matrix-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
  align-items: stretch;
}
.matrix-plot {
  min-width: 0;
  position: relative;
}
.matrix-x-title {
  position: absolute;
  left: 76px;
  right: 28px;
  bottom: 18px;
  text-align: right;
  color: #1c2b37;
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
}
.matrix-timeline {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 16px;
  background: #f3f7ff;
  border: 1px solid #cdddff;
  border-radius: 6px;
  margin: 18px 0 12px;
}
.timeline-play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  color: white;
  background: #2878ff;
  cursor: pointer;
  font-size: 15px;
}
.timeline-play:disabled {
  opacity: 1;
  background: #cbd5e1;
  color: #fff;
  box-shadow: 0 2px 5px #3341551a;
  cursor: not-allowed;
}
.timeline-track {
  flex: 1;
  min-width: 0;
}
.timeline-track :deep(.el-slider) {
  height: 24px;
}
.timeline-track :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  background: #409eff;
}
.timeline-labels {
  display: flex;
  justify-content: space-between;
  margin: 2px -10px 0;
}
.timeline-labels button {
  border: 0;
  padding: 4px 0;
  width: 26px;
  background: transparent;
  font: inherit;
  font-size: 10px;
  color: #91a2bc;
  cursor: pointer;
  white-space: nowrap;
}
.timeline-labels button.current {
  color: #2878ff;
  font-weight: 600;
}
.timeline-options {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
@media (max-width: 700px) {
  .matrix-timeline {
    flex-wrap: wrap;
    gap: 10px;
  }
  .timeline-options {
    width: 100%;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
  }
}
@media (max-width: 1100px) {
  .advisor-matrix {
    padding: 18px 14px 12px;
  }
}
</style>
