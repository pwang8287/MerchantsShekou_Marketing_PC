<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { EChartsOption } from 'echarts';
import { Download, RefreshRight } from '@element-plus/icons-vue';
import BaseChart from '../../../charts/components/BaseChart.vue';
import BubbleSizeSelector from '../../../components/common/BubbleSizeSelector.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import {
  buildProjectScoreBubbles,
  projectScoreGrid,
  projectScoreCoordinate,
} from '../../../utils/projectScoreBubble';
import type { BubbleSizeMetric } from '../../../utils/dealCycle';
import { fmt } from '../../../utils/metrics';
import { exportCsv } from '../../../utils/export';
const store = useDashboardStore();
const router = useRouter();
const chart = ref<InstanceType<typeof BaseChart>>();
const points = computed(() => buildProjectScoreBubbles(store.filtered));
const grid = computed(() => projectScoreGrid(points.value));
const plottable = computed(() => grid.value.points);
const selectedCell = ref('');
const selectedName = ref('');
const showLabels = ref(false);
const showTable = ref(false);
const sizeMetric = ref<BubbleSizeMetric>('current');
const activeStatus = ref('');
const shown = computed(() =>
  plottable.value.filter((p) => !activeStatus.value || p.status === activeStatus.value),
);
const selected = computed(() => shown.value.find((p) => p.name === selectedName.value));
const activeCell = computed(() => grid.value.cells.find((c) => c.id === selectedCell.value));
const listed = computed(() =>
  shown.value
    .filter((p) => !selectedCell.value || p.cell.id === selectedCell.value)
    .sort((a, b) => b.score - a.score),
);
const countCell = (id: string) => shown.value.filter((p) => p.cell.id === id).length;
watch([points, activeStatus], () => {
  selectedCell.value = '';
  selectedName.value = '';
});
function select(name: string) {
  const cell = grid.value.cells.find((c) => c.name === name);
  if (cell) {
    selectedCell.value = selectedCell.value === cell.id ? '' : cell.id;
    selectedName.value = '';
  } else if (shown.value.some((p) => p.name === name)) {
    selectedName.value = name;
    selectedCell.value = '';
  }
}
function reset() {
  selectedCell.value = '';
  selectedName.value = '';
  activeStatus.value = '';
  showLabels.value = false;
  sizeMetric.value = 'current';
  chart.value?.reset();
}
function download() {
  exportCsv(
    '项目六力得分与转化率',
    [
      '项目',
      '城市',
      '得分预警',
      '分区',
      '六力综合得分',
      '签约转化率（%）',
      '签约套数',
      '线索组数',
      '到访组数',
      '成交周期（模拟，天）',
    ],
    listed.value.map((p) => [
      p.name,
      p.city,
      p.status,
      p.cell.name,
      p.score,
      p.conversion!,
      p.contracts,
      p.leads,
      p.visits,
      p.dealCycle ?? '',
    ]),
  );
}
const missing = computed(() => points.value.length - plottable.value.length);
const colors = { 优秀: '#63b486', 关注: '#efb15a', 预警: '#e77d8a' };
const option = computed<EChartsOption>(() => {
  const maxContracts = Math.max(
    1,
    ...plottable.value.map((p) =>
      sizeMetric.value === 'cycle' ? (p.dealCycle ?? 0) : p.contracts,
    ),
  );
  const xBreaks = [0, grid.value.low, grid.value.high, grid.value.max];
  const yBreaks = [0, 60, 85, 100];
  return {
    animationDuration: 300,
    legend: { show: false },
    tooltip: {
      trigger: 'item',
      confine: true,
      renderMode: 'richText',
      formatter: (params) => {
        const data = (params as { data: { point?: (typeof points.value)[number] } }).data;
        const p = data?.point;
        return p
          ? `${p.name} · ${p.city}\n期间：${store.filter.period.join(' 至 ')}\n六力综合得分：${fmt(p.score, 1)} / 100分（${p.status}）\n签约转化率：${fmt(p.conversion!, 2)}%\n线索：${fmt(p.leads)}组 · 到访：${fmt(p.visits)}组\n签约：${fmt(p.contracts)}套\n成交周期（模拟）：${p.dealCycle === null ? '—' : fmt(p.dealCycle, 1) + ' 天'}\n点击选中项目，查看右侧详情`
          : '点击分区筛选该区项目';
      },
    },
    grid: { left: 56, right: 32, top: 42, bottom: 54 },
    xAxis: {
      type: 'value',
      min: 0,
      name: 'X · 签约转化率（%，分段比例）',
      nameLocation: 'middle',
      nameGap: 32,
      nameTextStyle: { color: '#52617b', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#71809a',
        formatter: (value: number) => `${fmt(xBreaks[Math.round(value)], 1)}%`,
      },
      splitLine: { show: false },
      max: 3,
      interval: 1,
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 3,
      interval: 1,
      name: 'Y · 综合得分（分，分段比例）',
      nameTextStyle: { color: '#52617b', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#71809a',
        formatter: (value: number) => `${yBreaks[Math.round(value)]}`,
      },
      splitLine: { show: false },
    },
    series: [
      {
        type: 'scatter',
        name: '分区',
        data: [],
        markArea: {
          silent: false,
          itemStyle: { borderWidth: 1, borderColor: '#dfe7f1' },
          label: { position: 'insideTopLeft', fontSize: 11 },
          data: grid.value.cells.map((c) => {
            const xs = [0, 1, 2, 3],
              ys = [3, 2, 1, 0];
            return [
              {
                name: c.name,
                xAxis: xs[c.col],
                yAxis: ys[c.row],
                itemStyle: {
                  color: c.tone === 'good' ? '#f0faf6' : c.tone === 'risk' ? '#fff3f5' : '#f1f5ff',
                  opacity: selectedCell.value && selectedCell.value !== c.id ? 0.4 : 1,
                },
                label: {
                  color: c.tone === 'good' ? '#159c77' : c.tone === 'risk' ? '#df5963' : '#2873ed',
                  padding: [9, 8],
                },
              },
              { xAxis: xs[c.col + 1], yAxis: ys[c.row + 1] },
            ];
          }),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#a8b9d1', width: 1, type: 'solid' },
          label: {
            show: true,
            color: '#71809a',
            fontSize: 10,
            formatter: (p: unknown) => {
              const item = p as { value: number; data: { xAxis?: number } };
              return item.data.xAxis !== undefined
                ? `${fmt(xBreaks[item.value], 1)}%`
                : `${yBreaks[item.value]}分`;
            },
          },
          data: [{ xAxis: 1 }, { xAxis: 2 }, { yAxis: 1 }, { yAxis: 2 }],
        },
      },
      ...Object.entries(colors).map(([status, color]) => ({
        type: 'scatter' as const,
        name: status,
        labelLayout: { hideOverlap: true },
        label: {
          show: showLabels.value,
          position: 'top' as const,
          formatter: '{b}',
          color: '#43546e',
          fontSize: 10,
        },
        emphasis: {
          scale: 1.1,
          label: { show: true, position: 'top' as const, formatter: '{b}', color: '#213e68' },
          itemStyle: { borderColor: '#14243d', borderWidth: 2 },
        },
        symbolSize: (value: number[]) => Math.max(8, Math.sqrt(value[2] / maxContracts) * 40),
        itemStyle: { color, borderColor: '#fff', borderWidth: 1.5 },
        data: shown.value
          .filter((p) => p.status === status)
          .map((p) => ({
            name: p.name,
            value: [
              projectScoreCoordinate(p.conversion!, xBreaks),
              projectScoreCoordinate(p.score, yBreaks),
              sizeMetric.value === 'cycle' ? (p.dealCycle ?? 0) : p.contracts,
            ],
            point: p,
            itemStyle: {
              opacity: selectedCell.value && selectedCell.value !== p.cell.id ? 0.15 : 0.86,
              borderColor: selectedName.value === p.name ? '#14243d' : '#fff',
              borderWidth: selectedName.value === p.name ? 2.5 : 1.5,
            },
          })),
      })),
    ],
  };
});
function openRow(p: { name: string }) {
  openProject(p.name);
}
function openProject(name: string) {
  if (points.value.some((p) => p.name === name))
    void router.push(`/marketing-six-forces/project/${encodeURIComponent(name)}`);
}
</script>

<template>
  <section class="panel nine-grid-panel">
    <header class="panel-head nine-grid-head">
      <div>
        <h3>
          项目营销六力得分 × 签约转化率 <span class="count-badge">{{ shown.length }} 个项目</span>
        </h3>
        <p>一个气泡代表一个项目；颜色区分得分预警，结合转化效率诊断项目营销能力。</p>
      </div>
      <div class="nine-grid-actions">
        <el-checkbox v-model="showLabels">显示名称</el-checkbox
        ><el-button size="small" @click="showTable = !showTable"
          >{{ showTable ? '收起' : '查看' }}明细</el-button
        ><el-button size="small" :icon="Download" :disabled="!listed.length" @click="download"
          >导出</el-button
        ><el-button
          text
          :icon="RefreshRight"
          title="重置图表"
          aria-label="重置项目得分图"
          @click="reset"
        /><el-button
          text
          :icon="Download"
          title="下载图表 PNG"
          aria-label="下载项目得分气泡图"
          @click="chart?.download()"
        />
      </div>
    </header>
    <div class="nine-grid-meta">
      <span>本期 {{ store.filter.period.join(' 至 ') }}</span
      ><span>气泡面积：{{ sizeMetric === 'cycle' ? '成交周期（模拟，天）' : '签约套数' }}</span
      ><span>评分：营销六力综合得分 / 100分</span
      ><span v-if="missing">{{ missing }} 个项目线索为0，无法计算转化率</span>
    </div>
    <BubbleSizeSelector v-model="sizeMetric" current-label="签约套数" />
    <div class="channel-legend" role="group" aria-label="得分预警图例">
      <button
        class="channel-legend-all"
        :class="{ active: !activeStatus }"
        :aria-pressed="!activeStatus"
        @click="activeStatus = ''"
      >
        全部项目</button
      ><button
        v-for="(color, name) in colors"
        :key="name"
        class="channel-legend-item"
        :style="{ '--channel-color': color }"
        :class="{ active: activeStatus === name }"
        :aria-pressed="activeStatus === name"
        @click="activeStatus = activeStatus === name ? '' : name"
      >
        <i aria-hidden="true"></i><span>{{ name }}</span
        ><small>{{ plottable.filter((p) => p.status === name).length }}</small>
      </button>
    </div>
    <div class="nine-grid-body">
      <BaseChart
        ref="chart"
        :option="option"
        :height="440"
        :empty="!shown.length"
        :loading="store.loading"
        unit="分 · %"
        @select="select"
      />
      <aside class="nine-grid-insights">
        <div class="nine-grid-counts">
          <div>
            <strong class="positive">{{ shown.filter((p) => p.status === '优秀').length }}</strong
            ><span>优秀项目</span>
          </div>
          <div>
            <strong class="negative">{{ shown.filter((p) => p.status === '预警').length }}</strong
            ><span>预警项目</span>
          </div>
          <div>
            <strong>{{ shown.length }}</strong
            ><span>项目总数</span>
          </div>
        </div>
        <div v-if="selected" class="selected-object">
          <div class="insight-eyebrow">当前选中</div>
          <h4>{{ selected.name }}</h4>
          <el-tag
            size="small"
            :type="
              selected.status === '优秀'
                ? 'success'
                : selected.status === '预警'
                  ? 'danger'
                  : 'warning'
            "
            >{{ selected.cell.name }}</el-tag
          >
          <dl>
            <div>
              <dt>成交周期（模拟）</dt>
              <dd>{{ selected.dealCycle === null ? '—' : fmt(selected.dealCycle, 1) + ' 天' }}</dd>
            </div>
            <div>
              <dt>六力综合得分</dt>
              <dd>{{ fmt(selected.score, 1) }} 分</dd>
            </div>
            <div>
              <dt>签约转化率</dt>
              <dd>{{ fmt(selected.conversion!, 2) }}%</dd>
            </div>
            <div>
              <dt>签约套数</dt>
              <dd>{{ fmt(selected.contracts) }} 套</dd>
            </div>
            <div>
              <dt>线索组数</dt>
              <dd>{{ fmt(selected.leads) }} 组</dd>
            </div>
          </dl>
          <p class="insight-advice">{{ selected.cell.advice }}</p>
          <el-button type="primary" plain size="small" @click="openProject(selected.name)"
            >查看项目六力详情</el-button
          ><el-button link size="small" @click="selectedName = ''">取消选中</el-button>
        </div>
        <template v-else
          ><div class="insight-eyebrow">
            {{ activeCell?.name || '项目得分分布'
            }}<button v-if="activeCell" @click="selectedCell = ''">全部分区</button>
          </div>
          <div class="cell-filter-grid">
            <button
              v-for="cell in grid.cells"
              :key="cell.id"
              :class="[cell.tone, { active: selectedCell === cell.id }]"
              :aria-pressed="selectedCell === cell.id"
              @click="select(cell.name)"
            >
              <span>{{ cell.name }}</span
              ><strong>{{ countCell(cell.id) }}</strong>
            </button>
          </div>
          <p class="insight-advice">
            {{
              activeCell?.advice ||
              '右上方代表能力得分较高、转化率相对较高；转化率位置是当前项目间的相对比较，需结合项目阶段和渠道结构判断。'
            }}
          </p>
          <div v-if="activeCell" class="cell-candidates">
            <button v-for="p in listed.slice(0, 4)" :key="p.name" @click="selectedName = p.name">
              <span>{{ p.name }}</span
              ><strong>{{ fmt(p.score, 1) }}分</strong>
            </button>
            <p v-if="!listed.length">当前分区暂无项目</p>
          </div></template
        >
      </aside>
    </div>
    <div class="nine-grid-footnote">
      成交周期为首次留资至签约的模拟天数，按签约套数加权，周期越长气泡越大。转化率 = 签约套数 /
      线索组数；得分预警分界为60、85分。{{
        grid.fallback
          ? '转化率四分位数重合或为0，横轴采用等宽三分区。'
          : '转化率按当前可绘制项目的Q1、Q3分区。'
      }}九宫格采用等宽等高的分段比例坐标，刻度标注真实数值；跨区间距离不代表相同数值差。点击背景或右侧宫格筛选，点击气泡选中项目。图例筛选不改变分界；本图不使用上方同比
      / 环比及增长阈值。
    </div>
    <div v-if="showTable" class="nine-grid-table">
      <el-table :data="listed" size="small" max-height="360" @row-click="openRow"
        ><el-table-column prop="name" label="项目" min-width="200" fixed /><el-table-column
          prop="city"
          label="城市"
          width="90" /><el-table-column
          prop="status"
          label="得分预警"
          width="100" /><el-table-column
          prop="cell.name"
          label="所在分区"
          min-width="130" /><el-table-column
          prop="score"
          label="综合得分"
          min-width="110"
          align="right"
          sortable
          ><template #default="{ row }">{{ fmt(row.score, 1) }}</template></el-table-column
        ><el-table-column
          prop="conversion"
          label="转化率（%）"
          min-width="130"
          align="right"
          sortable
          ><template #default="{ row }">{{ fmt(row.conversion, 2) }}%</template></el-table-column
        ><el-table-column
          prop="dealCycle"
          label="成交周期（模拟，天）"
          min-width="160"
          align="right"
          sortable
          ><template #default="{ row }">{{
            row.dealCycle === null ? '—' : fmt(row.dealCycle, 1)
          }}</template></el-table-column
        ><el-table-column prop="contracts" label="签约套数" min-width="110" align="right" sortable
      /></el-table>
      <p class="muted">
        共 {{ listed.length }} 个项目 · 分区与状态筛选同步用于导出 · 点击行查看项目详情
      </p>
    </div>
  </section>
</template>
