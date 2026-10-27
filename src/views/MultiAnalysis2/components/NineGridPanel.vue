<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Download, RefreshRight } from '@element-plus/icons-vue';
import BaseChart from '../../../charts/components/BaseChart.vue';
import { nineGridOption } from '../../../charts/options/nineGrid';
import { bubbleColor, channelColors } from '../../../charts/themes/bubbles';
import { buildNineGrid, filterGridByChannel } from '../../../utils/nineGrid';
import { fmt } from '../../../utils/metrics';
import { exportCsv } from '../../../utils/export';
import { useDashboardStore } from '../../../stores/dashboard';
import type { MarketingPerformanceMetric } from '../../../types';
import type { CompareMode, GridPoint, GridThresholds, NineGridKind } from '../../../types/nineGrid';
const props = defineProps<{
  kind: NineGridKind;
  title: string;
  description: string;
  rows: MarketingPerformanceMetric[];
  mode: CompareMode;
  thresholds: GridThresholds;
}>();
const store = useDashboardStore();
const chart = ref<InstanceType<typeof BaseChart>>();
const selectedCell = ref('');
const selectedName = ref('');
const showLabels = ref(false);
const showTable = ref(false);
const activeChannel = ref('');
const advisor = computed(() => props.kind === 'advisor');
const baseResult = computed(() =>
  buildNineGrid(props.rows, store.filter, props.kind, props.mode, props.thresholds, 'object'),
);
const result = computed(() =>
  props.kind === 'channel'
    ? filterGridByChannel(baseResult.value, activeChannel.value)
    : baseResult.value,
);
const channelLegend = computed(() => {
  const available = [
    ...new Set([
      ...baseResult.value.points.map((p) => p.group),
      ...baseResult.value.excluded.map((p) => p.group),
    ]),
  ];
  const names = [
    ...Object.keys(channelColors),
    ...available.filter((name) => !channelColors[name]),
  ];
  return names.map((name) => ({
    name,
    color: bubbleColor(name),
    count: baseResult.value.points.filter((p) => p.group === name).length,
    disabled: !available.includes(name),
  }));
});
function selectChannel(name: string) {
  activeChannel.value = activeChannel.value === name ? '' : name;
}
watch(baseResult, () => {
  if (
    activeChannel.value &&
    !channelLegend.value.some((item) => item.name === activeChannel.value && !item.disabled)
  )
    activeChannel.value = '';
});
const option = computed(() =>
  nineGridOption(
    result.value,
    props.kind,
    props.thresholds,
    selectedCell.value,
    selectedName.value,
    showLabels.value,
  ),
);
const selected = computed(() => result.value.points.find((p) => p.name === selectedName.value));
const activeCell = computed(() => result.value.cells.find((c) => c.id === selectedCell.value));
const listed = computed(() =>
  result.value.points
    .filter((p) => !selectedCell.value || p.cell.id === selectedCell.value)
    .sort((a, b) => b.current.amount - a.current.amount),
);
const excellent = computed(() => result.value.points.filter((p) => p.cell.tone === 'good').length);
const risk = computed(() => result.value.points.filter((p) => p.cell.tone === 'risk').length);
watch(result, () => {
  selectedCell.value = '';
  selectedName.value = '';
});
function select(name: string) {
  const cell = result.value.cells.find((c) => c.name === name);
  if (cell) {
    selectedCell.value = selectedCell.value === cell.id ? '' : cell.id;
    selectedName.value = '';
    return;
  }
  if (result.value.points.some((p) => p.name === name)) {
    selectedName.value = name;
    selectedCell.value = '';
  }
}
function reset() {
  activeChannel.value = '';
  selectedCell.value = '';
  selectedName.value = '';
  showLabels.value = false;
  chart.value?.reset();
}
function drill(p: GridPoint) {
  store.drill(p.name + ' · ' + p.cell.name, p.records);
}
function download() {
  exportCsv(
    props.title + (props.kind === 'channel' ? '_' + (activeChannel.value || '全部渠道') : ''),
    [
      props.kind === 'advisor' ? '顾问 / 项目' : '对象',
      '分类',
      '所在分区',
      '签约金额（万元）',
      '本期签约套数',
      '比较期签约套数',
      '签约量变化（%）',
      advisor.value ? '到访转签约率变化（百分点）' : '单套获客成本变化（%）',
    ],
    listed.value.map((p) => [
      p.name,
      p.group,
      p.cell.name,
      p.current.amount,
      p.current.contracts,
      p.previous.contracts,
      p.x.toFixed(2),
      p.y.toFixed(2),
    ]),
  );
}
const cellCount = (id: string) => result.value.points.filter((p) => p.cell.id === id).length;
</script>
<template>
  <section class="panel nine-grid-panel">
    <header class="panel-head nine-grid-head">
      <div>
        <h3>
          {{ title }} <span class="count-badge">{{ result.points.length }} 个可比对象</span>
        </h3>
        <p>{{ description }}</p>
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
          aria-label="重置九宫格"
          @click="reset"
        /><el-button
          text
          :icon="Download"
          title="下载图表 PNG"
          aria-label="下载九宫格图片"
          @click="chart?.download(kind === 'channel')"
        />
      </div>
    </header>
    <div class="nine-grid-meta">
      <span>本期 {{ store.filter.period.join(' 至 ') }}</span
      ><span>比较期 {{ result.previousPeriod.join(' 至 ') }}</span
      ><span>气泡面积：签约金额</span
      ><el-popover v-if="result.excluded.length" placement="bottom" :width="340" trigger="click"
        ><template #reference
          ><button class="excluded-trigger">
            {{ result.excluded.length }} 个不可比对象 ⓘ
          </button></template
        >
        <div class="excluded-list">
          <p v-for="p in result.excluded" :key="p.name">
            <strong>{{ p.name }}</strong
            ><span>{{ p.reason }}</span>
          </p>
        </div></el-popover
      >
    </div>
    <div v-if="kind === 'channel'" class="channel-legend" role="group" aria-label="渠道大类图例">
      <button
        class="channel-legend-all"
        :class="{ active: !activeChannel }"
        :aria-pressed="!activeChannel"
        @click="activeChannel = ''"
      >
        全部渠道
      </button>
      <button
        v-for="item in channelLegend"
        :key="item.name"
        class="channel-legend-item"
        :class="{ active: activeChannel === item.name }"
        :style="{ '--channel-color': item.color }"
        :disabled="item.disabled"
        :aria-pressed="activeChannel === item.name"
        :aria-label="item.name + '，点击查看细分对象'"
        @click="selectChannel(item.name)"
      >
        <i aria-hidden="true"></i><span>{{ item.name }}</span
        ><small>{{ item.count }}</small>
      </button>
    </div>
    <div v-if="kind === 'channel'" class="channel-drill-context">
      <span>{{
        activeChannel
          ? '全部渠道 / ' + activeChannel + ' / 细分对象'
          : '全部渠道 · 供应商 / 平台 / 推荐来源'
      }}</span
      ><el-button v-if="activeChannel" link type="primary" size="small" @click="activeChannel = ''"
        >返回全部渠道</el-button
      ><span v-else>点击彩色图例，查看对应渠道大类的细分气泡</span>
    </div>
    <div class="nine-grid-body">
      <BaseChart
        ref="chart"
        :option="option"
        :height="440"
        :loading="store.loading"
        :empty="!result.points.length"
        :unit="advisor ? '% / 百分点' : '%'"
        @select="select"
      />
      <aside class="nine-grid-insights">
        <div class="nine-grid-counts">
          <div>
            <strong class="positive">{{ excellent }}</strong
            ><span>改善对象</span>
          </div>
          <div>
            <strong class="negative">{{ risk }}</strong
            ><span>关注对象</span>
          </div>
          <div>
            <strong>{{ result.total }}</strong
            ><span>对象总数</span>
          </div>
        </div>
        <template v-if="selected"
          ><div class="selected-object">
            <div class="insight-eyebrow">当前选中</div>
            <h4>{{ selected.name }}</h4>
            <el-tag
              size="small"
              :type="
                selected.cell.tone === 'good'
                  ? 'success'
                  : selected.cell.tone === 'risk'
                    ? 'danger'
                    : 'info'
              "
              >{{ selected.cell.name }}</el-tag
            >
            <dl>
              <div>
                <dt>签约金额</dt>
                <dd>{{ fmt(selected.current.amount) }} 万元</dd>
              </div>
              <div>
                <dt>签约套数</dt>
                <dd>{{ fmt(selected.current.contracts) }} 套</dd>
              </div>
              <div>
                <dt>签约量变化</dt>
                <dd>{{ fmt(selected.x, 1) }}%</dd>
              </div>
              <div>
                <dt>{{ advisor ? '转化率变化' : '获客成本变化' }}</dt>
                <dd>{{ fmt(selected.y, 1) }}{{ advisor ? ' pp' : '%' }}</dd>
              </div>
            </dl>
            <p class="insight-advice">{{ selected.cell.advice }}</p>
            <el-button type="primary" plain size="small" @click="drill(selected)"
              >查看下钻明细</el-button
            ><el-button link size="small" @click="selectedName = ''">取消选中</el-button>
          </div></template
        >
        <template v-else
          ><div class="insight-eyebrow">
            {{ activeCell ? activeCell.name : '九宫格分布' }}
            <button v-if="activeCell" @click="selectedCell = ''">全部分区</button>
          </div>
          <div class="cell-filter-grid">
            <button
              v-for="cell in result.cells"
              :key="cell.id"
              :class="[cell.tone, { active: selectedCell === cell.id }]"
              :aria-pressed="selectedCell === cell.id"
              @click="select(cell.name)"
            >
              <span>{{ cell.name }}</span
              ><strong>{{ cellCount(cell.id) }}</strong>
            </button>
          </div>
          <p class="insight-advice">
            {{
              activeCell
                ? activeCell.advice
                : advisor
                  ? '右上方代表签约增长、转化改善。跨顾问比较需结合线索分配、项目及货源差异。'
                  : '右下方代表签约增长、单套成本下降。结合回款与费用结构判断增长质量。'
            }}
          </p>
          <div v-if="activeCell" class="cell-candidates">
            <button v-for="p in listed.slice(0, 4)" :key="p.name" @click="selectedName = p.name">
              <span>{{ p.name }}</span
              ><strong>{{ fmt(p.current.amount / 10000, 2) }} 亿</strong>
            </button>
            <p v-if="!listed.length">当前分区暂无对象</p>
          </div></template
        >
      </aside>
    </div>
    <div class="nine-grid-footnote">
      {{
        advisor
          ? '转化率 = 签约套数 / 到访组数，变化按百分点计算。'
          : '单套获客成本 = 营销费用 × 10000 / 签约套数（元/套）。'
      }}
      分界线为演示参数；点击背景分区或右侧宫格筛选，点击气泡查看指标。
    </div>
    <div v-if="showTable" class="nine-grid-table">
      <el-table :data="listed" max-height="360" size="small" @row-click="drill"
        ><el-table-column
          prop="name"
          :label="advisor ? '顾问 / 所属项目' : '对象名称'"
          min-width="200"
          fixed
          show-overflow-tooltip
        /><el-table-column
          prop="group"
          label="分类"
          min-width="110"
          show-overflow-tooltip
        /><el-table-column label="所在分区" width="105"
          ><template #default="{ row }"
            ><el-tag
              size="small"
              :type="
                row.cell.tone === 'good' ? 'success' : row.cell.tone === 'risk' ? 'danger' : 'info'
              "
              >{{ row.cell.name }}</el-tag
            ></template
          ></el-table-column
        ><el-table-column
          prop="current.amount"
          label="签约金额（万元）"
          min-width="145"
          align="right"
          sortable
          ><template #default="{ row }">{{ fmt(row.current.amount) }}</template></el-table-column
        ><el-table-column
          prop="current.contracts"
          label="本期签约（套）"
          min-width="130"
          align="right"
          sortable
        /><el-table-column
          prop="previous.contracts"
          label="比较期签约（套）"
          min-width="140"
          align="right"
        /><el-table-column prop="x" label="签约量变化（%）" min-width="145" align="right" sortable
          ><template #default="{ row }">{{ fmt(row.x, 1) }}%</template></el-table-column
        ><el-table-column
          prop="y"
          :label="advisor ? '转化率变化（百分点）' : '获客成本变化（%）'"
          min-width="175"
          align="right"
          sortable
          ><template #default="{ row }"
            >{{ fmt(row.y, 1) }}{{ advisor ? ' pp' : '%' }}</template
          ></el-table-column
        ></el-table
      >
      <p class="muted">共 {{ listed.length }} 个对象 · 点击行查看明细 · 当前分区筛选同步用于导出</p>
    </div>
  </section>
</template>
