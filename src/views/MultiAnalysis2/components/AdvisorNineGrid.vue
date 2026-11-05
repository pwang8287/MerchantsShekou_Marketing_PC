<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import type { EChartsOption, LineSeriesOption, ScatterSeriesOption } from 'echarts';
import type { MarketingPerformanceMetric } from '../../../types';
import type { GridPoint } from '../../../types/nineGrid';
import BaseChart from '../../../charts/components/BaseChart.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { buildReceptionHistory } from '../../../utils/advisorReceptionMatrix';
import { fmt } from '../../../utils/metrics';
import { matrixReplayPoints } from '../../../utils/matrixReplay';
import type { BubbleSizeMetric } from '../../../utils/dealCycle';
const props = withDefaults(
  defineProps<{
    rows: MarketingPerformanceMetric[];
    dimension?: 'advisor' | 'project';
    size?: BubbleSizeMetric;
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
const projectMode = computed(() => props.dimension === 'project');
const entityLabel = computed(() => (projectMode.value ? '项目' : '顾问'));
const store = useDashboardStore();
const size = computed(() => props.size);
const selectedName = ref('');
const pointCity = (point: GridPoint) => point.records[0]?.city || '未分配城市';
const color = (city: string) => props.cityColors[city] || '#4f8eff';
const historyMonths = ref(6);
const frameIndex = ref(5);
const playing = ref(false);
let playbackTimer: ReturnType<typeof setInterval> | undefined;
const history = computed(() =>
  buildReceptionHistory(props.rows, store.filter, props.dimension, historyMonths.value),
);
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
watch([() => props.rows, () => store.filter], () => {
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
    (point) => !props.selectedProject || point.group === props.selectedProject,
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
  if (name === selectedName.value || shown.value.some((point) => point.name === name))
    selectedName.value = selectedName.value === name ? '' : name;
}
watch(
  () => props.selectedProject,
  () => {
    pause();
    selectedName.value = '';
  },
);
function position(value: number, boundaries: number[]) {
  const band = value < boundaries[1] ? 0 : value > boundaries[2] ? 2 : 1;
  return band + (value - boundaries[band]) / (boundaries[band + 1] - boundaries[band]);
}
const option = computed<EChartsOption>(() => {
  const x = result.value.xEdges;
  const y = result.value.yEdges;
  const max = Math.max(
    1,
    ...result.value.points.map((p) =>
      size.value === 'cycle' ? (p.dealCycle ?? 0) : p.current.amount,
    ),
  );
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
  const tones = { good: '#F0FAF6', risk: '#FFF3F5', neutral: '#F1F5FF' };
  return {
    animationDurationUpdate: 800,
    animationEasingUpdate: 'cubicInOut',
    tooltip: {
      trigger: 'item',
      show: !playing.value,
      triggerOn: selectedName.value || playing.value ? 'none' : 'mousemove|click',
      alwaysShowContent: !!selectedName.value && !playing.value,
      enterable: !!selectedName.value && !playing.value,
      appendToBody: true,
      backgroundColor: '#fff',
      borderColor: '#dfe7f1',
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
        return `<b>${name}</b><br/>${data?.month || currentFrame.value.month}<br/>${point.cell.name}<br/>接待人数：${fmt(point.current.visitPeople)} 人<br/>日均接待人数：${fmt(point.y, 2)} 人/日<br/>到访至签约转化率：${fmt(point.x, 2)}%<br/>签约套数：${fmt(point.current.contracts)} 套<br/>签约金额：${fmt(point.current.amount, 2)} 万元<br/>统计天数：${data?.days || result.value.days} 天`;
      },
    },
    grid: { left: 76, right: 28, top: 38, bottom: 76 },
    xAxis: {
      type: 'value',
      min: 0,
      max: 3,
      interval: 1,
      axisLabel: {
        formatter: (v: number) => fmt(x[Math.round(v)], 1) + '%',
        fontSize: 11,
        color: '#71809a',
      },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 3,
      interval: 1,
      name: 'Y · 日均接待人数（人/日）',
      nameTextStyle: {
        align: 'left',
        padding: [0, 0, 0, -54],
        fontSize: 11,
        fontWeight: 700,
        color: '#64748b',
      },
      axisLabel: {
        formatter: (v: number) => fmt(y[Math.round(v)], 2),
        fontSize: 11,
        color: '#71809a',
      },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    series: [
      {
        type: 'scatter',
        id: 'current-bubbles',
        z: 5,
        symbolSize: (value: number[]) => Math.sqrt(value[2] / max) * 46 + 5,
        emphasis: { scale: 1.2 },
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
                  cell.tone === 'good' ? '#20a88a' : cell.tone === 'risk' ? '#e27978' : '#1677ff',
              },
            },
            { xAxis: cell.col + 1, yAxis: 3 - cell.row },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: '#9dafc9', type: 'solid', width: 1 },
          data: [{ xAxis: 1 }, { xAxis: 2 }, { yAxis: 1 }, { yAxis: 2 }],
        },
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
              : Math.sqrt(
                  (size.value === 'cycle' ? (point.dealCycle ?? 0) : point.current.amount) / max,
                ) *
                  46 +
                5,
          label: {
            show: point.name === selectedName.value && frameIndex.value < historyMonths.value - 1,
            formatter: temporalLabel(frameIndex.value),
            position: 'top',
            color: color(pointCity(point)),
            fontSize: 10,
          },
          value: [
            position(point.x, x),
            position(point.y, y),
            size.value === 'cycle' ? (point.dealCycle ?? 0) : point.current.amount,
          ],
          itemStyle: {
            color: color(pointCity(point)),
            opacity:
              props.search && !filtered.value.some((item) => item.name === point.name)
                ? 0.08
                : selectedName.value && selectedName.value !== point.name
                  ? 0.2
                  : 0.9,
            borderColor: selectedName.value === point.name ? '#1677ff' : '#fff',
            borderWidth: selectedName.value === point.name ? 3 : 1,
          },
        })),
      },
      ...trajectory,
    ],
  };
});
const pinnedTooltip = computed(() => {
  if (!selectedName.value || playing.value) return undefined;
  const currentIndex = replayPoints.value.findIndex((point) => point.name === selectedName.value);
  if (currentIndex >= 0) return { seriesId: 'current-bubbles', dataIndex: currentIndex };
  const available = selectedHistory.value
    .map((item, index) => ({ ...item, index }))
    .filter((item) => item.point && item.index < frameIndex.value);
  const nearest = [...available].sort(
    (a, b) => Math.abs(a.index - frameIndex.value) - Math.abs(b.index - frameIndex.value),
  )[0];
  return nearest
    ? { seriesId: 'history-points', dataIndex: available.indexOf(nearest) }
    : undefined;
});
</script>
<template>
  <section class="advisor-matrix">
    <header class="matrix-head">
      <h2>{{ entityLabel }}接待效率与转化九宫格分析</h2>
      <p>
        横轴为到访至签约转化率，纵轴为日均接待人数。每个气泡代表一个{{
          entityLabel
        }}，颜色区分所属城市，通过右侧共用项目列表进行筛选，点击气泡查看历史位置轨迹。
      </p>
    </header>
    <div class="matrix-body">
      <div class="matrix-plot">
        <BaseChart
          :option="option"
          :pinned-tooltip="pinnedTooltip"
          transition
          :height="520"
          :loading="store.loading"
          :empty="!shown.length && !selectedHistory.some((item) => item.point)"
          @select="select"
        />
        <div class="matrix-x-title">X · 到访至签约转化率（%）</div>
      </div>
    </div>
    <div class="matrix-timeline">
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
  color: #64748b;
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
