<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../../charts/components/BaseChart.vue';
import ConversionFunnelVisual from '../../../components/dashboard/ConversionFunnelVisual.vue';
import ConversionAttribution from './ConversionAttribution.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { bubbleColor } from '../../../charts/themes/bubbles';
import { donutOption } from '../../../charts/options';
import { groupRows, fmt, divide, filterRows, summarize } from '../../../utils/metrics';
import type { AggregateRow } from '../../../types';
import {
  averageChannelValue,
  channelAverageRow,
  isChannelAverage,
} from '../../../utils/channelAverage';
import { sortChannelTable, type ChannelTableSort } from '../../../utils/channelTableSort';
const tableSort = ref<ChannelTableSort>({ prop: '', order: null });
const store = useDashboardStore();
const analysisTab = ref<'structure' | 'attribution'>('structure');
const stageDefinitions = [
  { key: 'leads', name: '线索数量', unit: '组', color: '#a3c4fa' },
  { key: 'visitPeople', name: '到访人数', unit: '人', color: '#7aa7f5' },
  { key: 'subscriptionUnits', name: '认购套数', unit: '套', color: '#508bf0' },
  { key: 'contracts', name: '签约套数', unit: '套', color: '#2873ed' },
] as const;
const selectedIndex = ref<number | null>(null);
const displayedIndex = ref(1);
function toggleStage(index: number) {
  selectedIndex.value = selectedIndex.value === index ? null : index;
  displayedIndex.value = index;
}
const activeChannel = ref('');
watch(
  () => store.filter,
  () => {
    activeChannel.value = '';
  },
);
watch(selectedIndex, () => {
  activeChannel.value = '';
});
const selected = computed(() => stageDefinitions[displayedIndex.value]);
const totals = computed(() => summarize(store.filtered));
const stages = computed(() =>
  stageDefinitions.map((stage, index) => ({
    ...stage,
    value: totals.value[stage.key],
    rate: index
      ? divide(totals.value[stage.key], totals.value[stageDefinitions[index - 1].key]) * 100
      : null,
  })),
);
const total = computed(() => totals.value[selected.value.key]);
const stageCostLabel = computed(
  () =>
    ({
      leads: '单条线索成本',
      visitPeople: '单组到访成本',
      subscriptionUnits: '单套认购获客成本',
      contracts: '单套签约获客成本',
    })[selected.value.key],
);
const stageCostUnit = computed(
  () =>
    ({ leads: '条', visitPeople: '组', subscriptionUnits: '套', contracts: '套' })[
      selected.value.key
    ],
);

type ConversionMetric = 'leads' | 'visitPeople' | 'subscriptionUnits' | 'contracts';
interface ConversionColumn {
  label: string;
  numerator: ConversionMetric;
  denominator: ConversionMetric;
}
const conversionColumns = computed<ConversionColumn[]>(() => {
  switch (selected.value.key) {
    case 'visitPeople':
      return [{ label: '线索至到访转化率', numerator: 'visitPeople', denominator: 'leads' }];
    case 'subscriptionUnits':
      return [
        { label: '到访至认购转化率', numerator: 'subscriptionUnits', denominator: 'visitPeople' },
      ];
    case 'contracts':
      return [
        { label: '认购至签约转化率', numerator: 'contracts', denominator: 'subscriptionUnits' },
        { label: '到访至签约转化率', numerator: 'contracts', denominator: 'visitPeople' },
      ];
    default:
      return [];
  }
});
function conversionRate(row: Record<ConversionMetric, number>, column: ConversionColumn) {
  return row[column.denominator] ? (row[column.numerator] / row[column.denominator]) * 100 : null;
}
const headquartersSummary = computed(() => {
  const summary = summarize(
    filterRows(store.rows, {
      ...store.filter,
      organization: '',
      organizationNames: [],
      region: '',
      city: '',
      project: '',
    }),
  );
  return summary;
});
function conversionClass(row: AggregateRow, column: ConversionColumn) {
  const rate = conversionRate(row, column);
  const headquartersRate = conversionRate(headquartersSummary.value, column);
  if (rate === null || headquartersRate === null) return '';
  const difference = rate - headquartersRate;
  return difference > 1e-9 ? 'rate-above' : difference < -1e-9 ? 'rate-below' : '';
}
const channels = computed(() =>
  groupRows(store.filtered, 'channel').map((row) => ({
    ...row,
    stageValue: row[selected.value.key],
    share: total.value ? (row[selected.value.key] / total.value) * 100 : null,
    stageCost: row[selected.value.key] ? (row.fee * 10000) / row[selected.value.key] : null,
  })),
);
const unsortedChannelTableRows = computed(() => {
  const average = channelAverageRow(channels.value);
  return average
    ? [
        ...channels.value,
        {
          ...average,
          stageValue: total.value / channels.value.length,
          share: total.value ? 100 / channels.value.length : null,
          stageCost: averageChannelValue(channels.value, (row) => row.stageCost),
        },
      ]
    : channels.value;
});
const channelTableRows = computed(() =>
  sortChannelTable(unsortedChannelTableRows.value, tableSort.value, (row, key) => {
    const column = conversionColumns.value.find((item) => item.label === key);
    return column
      ? conversionRate(row, column)
      : (row[key as keyof typeof row] as string | number | null);
  }),
);
function drillChannel(row: AggregateRow) {
  store.drill(row.name + ' · 渠道客户', row.records, row.name, selected.value.key);
}
function channelRowClass({ row }: { row: AggregateRow }) {
  return isChannelAverage(row)
    ? 'channel-average-row'
    : row.name === activeChannel.value
      ? 'channel-hovered'
      : '';
}
function hoverChannel(row: AggregateRow) {
  activeChannel.value = isChannelAverage(row) ? '' : row.name;
}
const structure = computed<EChartsOption>(() => {
  const option = donutOption(
    channels.value.map((row) => ({ ...row, leads: row.stageValue })),
    {
      showLegend: false,
      colorForName: bubbleColor,
    },
  );
  if (Array.isArray(option.series)) {
    option.series = option.series.map((series) =>
      series.type === 'pie'
        ? {
            ...series,
            emphasis: { focus: 'self', scale: true, scaleSize: 5, itemStyle: { opacity: 1 } },
            blur: { itemStyle: { opacity: 0.25 } },
          }
        : series,
    );
  }
  option.graphic = [
    {
      type: 'text',
      left: 'center',
      top: '40%',
      style: {
        text: selected.value.name,
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: 12,
        fontWeight: 500,
        fill: '#66758c',
      },
    },
    {
      type: 'text',
      left: 'center',
      top: '48%',
      style: {
        text: fmt(total.value),
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        fontSize: fmt(total.value).length > 7 ? 20 : 24,
        fontWeight: 700,
        fill: '#111827',
      },
    },
    {
      type: 'text',
      left: 'center',
      top: '57.5%',
      style: {
        text: selected.value.unit,
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: 12,
        fontWeight: 400,
        fill: '#66758c',
      },
    },
  ];
  // 构成数据使用当前环节数量，避免沿用线索数量或线索的同环比口径。
  option.tooltip = {
    trigger: 'item',
    confine: true,
    backgroundColor: '#fff',
    borderColor: '#dce5f2',
    textStyle: { color: '#435775', fontSize: 12 },
    formatter: (params: unknown) => {
      const item = params as { name: string; value: number; percent: number; marker: string };
      return `${item.marker}${item.name}<br/>${selected.value.name}：${fmt(Number(item.value))} ${selected.value.unit}<br/>渠道占比：${fmt(item.percent, 2)}%`;
    },
  };
  return option;
});
</script>
<template>
  <section class="panel conversion-composition">
    <header class="panel-head">
      <div>
        <h3>客户转化与渠道构成分析</h3>
        <p>点击环节可查看具体环节渠道构成及归因分析</p>
      </div>
    </header>
    <div class="conversion-layout">
      <ConversionFunnelVisual
        :stages="stages"
        :totals="totals"
        :selected-index="selectedIndex"
        @select="toggleStage"
      />
      <div class="composition-panel" :style="{ '--stage-color': selected.color }">
        <div class="composition-tabs" role="tablist" aria-label="渠道分析方式">
          <button
            role="tab"
            :aria-selected="analysisTab === 'structure'"
            :class="{ active: analysisTab === 'structure' }"
            @click="analysisTab = 'structure'"
          >
            结构分析
          </button>
          <button
            role="tab"
            :aria-selected="analysisTab === 'attribution'"
            :class="{ active: analysisTab === 'attribution' }"
            @click="analysisTab = 'attribution'"
          >
            归因分析
          </button>
        </div>
        <div class="analysis-content">
          <div
            class="analysis-view structure-view"
            :class="{ 'inactive-view': analysisTab !== 'structure' }"
            :aria-hidden="analysisTab !== 'structure'"
          >
            <div class="composition-body">
              <div class="composition-donut">
                <h4 class="donut-heading">{{ selected.name }}渠道构成</h4>
                <BaseChart
                  :option="structure"
                  :height="280"
                  :empty="!total"
                  :loading="store.loading"
                  :highlight-name="activeChannel"
                  @hover="activeChannel = $event"
                  @leave="activeChannel = ''"
                />
              </div>
              <el-table
                :data="channelTableRows"
                @sort-change="tableSort = $event"
                size="small"
                class="composition-table channel-legend-table"
                :class="{ 'contract-composition-table': selected.key === 'contracts' }"
                :row-class-name="channelRowClass"
                @cell-mouse-enter="hoverChannel"
                @mouseleave="activeChannel = ''"
              >
                <el-table-column
                  prop="name"
                  sortable="custom"
                  label="渠道"
                  :min-width="selected.key === 'contracts' ? 76 : 95"
                >
                  <template #default="{ row }"
                    ><span v-if="isChannelAverage(row)">平均值</span
                    ><button v-else class="channel-drill" @click="drillChannel(row)">
                      <i :style="{ background: bubbleColor(row.name) }" />{{ row.name }}
                    </button></template
                  >
                </el-table-column>
                <el-table-column
                  :label="selected.name"
                  prop="stageValue"
                  sortable="custom"
                  :min-width="selected.key === 'contracts' ? 65 : 84"
                  align="right"
                >
                  <template #default="{ row }"
                    >{{ fmt(row.stageValue, isChannelAverage(row) ? 2 : 0) }}
                    {{ selected.unit }}</template
                  >
                </el-table-column>
                <el-table-column
                  label="渠道占比"
                  prop="share"
                  sortable="custom"
                  :min-width="selected.key === 'contracts' ? 58 : 76"
                  align="right"
                >
                  <template #default="{ row }">{{
                    isChannelAverage(row) ? '-' : row.share === null ? '—' : fmt(row.share, 2) + '%'
                  }}</template>
                </el-table-column>
                <el-table-column
                  :label="stageCostLabel"
                  prop="stageCost"
                  sortable="custom"
                  :min-width="selected.key === 'contracts' ? 100 : 115"
                  align="right"
                >
                  <template #header
                    ><el-tooltip :content="`营销费用 ÷ ${selected.name}；单位：元/${stageCostUnit}`"
                      ><span>{{ stageCostLabel }} ⓘ</span></el-tooltip
                    ></template
                  >
                  <template #default="{ row }">{{
                    row.stageCost === null ? '—' : fmt(row.stageCost, 2)
                  }}</template>
                </el-table-column>
                <el-table-column
                  v-for="column in conversionColumns"
                  :key="column.label"
                  :prop="column.label"
                  sortable="custom"
                  :label="column.label"
                  :min-width="selected.key === 'contracts' ? 104 : 125"
                  align="right"
                >
                  <template #default="{ row }"
                    ><span class="conversion-rate" :class="conversionClass(row, column)">{{
                      conversionRate(row, column) === null
                        ? '—'
                        : fmt(conversionRate(row, column)!, 1) + '%'
                    }}</span></template
                  >
                </el-table-column>
              </el-table>
            </div>
          </div>
          <ConversionAttribution
            class="analysis-view"
            :class="{ 'inactive-view': analysisTab !== 'attribution' }"
            :aria-hidden="analysisTab !== 'attribution'"
            :stage="selected"
          />
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.conversion-composition {
  padding: 16px;
  margin-bottom: 16px;
}
.conversion-composition > .panel-head {
  margin-bottom: 0;
}
.conversion-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.85fr) minmax(0, 1.6fr);
  gap: 24px;
  align-items: stretch;
}
h4 {
  margin: 0;
  font-size: 13px;
  color: #14243d;
}
.composition-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #edf1f5;
  padding-left: 20px;
}
.analysis-content {
  display: grid;
  min-width: 0;
  flex: 1;
}
.analysis-view {
  grid-area: 1 / 1;
  min-width: 0;
}
.structure-view {
  display: flex;
  flex-direction: column;
}
.inactive-view {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.composition-tabs {
  display: flex;
  gap: 2px;
  align-self: flex-start;
  padding: 2px;
  background: #f5f6f8;
  border-radius: 5px;
  margin-bottom: 12px;
}
.composition-tabs button {
  padding: 6px 12px;
  border: 0;
  background: transparent;
  border-radius: 4px;
  color: #667380;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.composition-tabs button.active {
  background: #fff;
  color: #26394f;
  box-shadow: 0 1px 4px #00000010;
  font-weight: 600;
}
.composition-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 0 8px;
}
.composition-heading span {
  font-size: 11px;
  color: #8a98ac;
}
.composition-body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(150px, 0.7fr) minmax(0, 2fr);
  align-items: center;
  align-content: center;
  gap: 12px;
  padding: 4px 0 0;
}
.composition-donut {
  display: contents;
}
.donut-heading {
  grid-area: 1 / 1;
  text-align: left;
  white-space: nowrap;
}
.composition-donut > :deep(.chart-root) {
  grid-area: 2 / 1;
}
.composition-table {
  grid-area: 2 / 2;
  width: 100%;
}
.composition-table :deep(.channel-hovered > td.el-table__cell) {
  background: #eff6ff;
  box-shadow:
    inset 0 1px #b7d6ff,
    inset 0 -1px #b7d6ff;
}
.composition-table :deep(.channel-hovered > td:first-child) {
  box-shadow:
    inset 1px 0 #b7d6ff,
    inset 0 1px #b7d6ff,
    inset 0 -1px #b7d6ff;
  border-radius: 4px 0 0 4px;
}
.composition-table :deep(.channel-hovered > td:last-child) {
  box-shadow:
    inset -1px 0 #b7d6ff,
    inset 0 1px #b7d6ff,
    inset 0 -1px #b7d6ff;
  border-radius: 0 4px 4px 0;
}
.composition-table :deep(.cell) {
  padding: 0 5px;
  line-height: 20px;
  white-space: nowrap;
  font-size: 10px;
}
.composition-table :deep(td.el-table__cell),
.composition-table :deep(th.el-table__cell) {
  padding: 7px 0;
}
.contract-composition-table :deep(.cell) {
  padding: 0 3px;
}
.contract-composition-table .channel-drill {
  gap: 4px;
}
.contract-composition-table .conversion-rate {
  padding: 1px 3px;
}
.channel-drill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  padding: 0;
  color: #4285f4;
  cursor: pointer;
  font: inherit;
  white-space: nowrap;
}
.channel-drill i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}
.conversion-rate {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 5px;
  font-weight: 600;
}
.rate-above {
  color: #527dcc;
  background: #eff5ff;
}
.rate-below {
  color: #8792a2;
  background: #f5f6f8;
}
@media (max-width: 1100px) {
  .conversion-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .conversion-funnel {
    max-width: 500px;
    width: 100%;
    margin: 0 auto;
  }
  .composition-panel {
    border-left: 0;
    border-top: 1px solid #edf1f5;
    padding: 16px 0 0;
  }
}
@media (max-width: 760px) {
  .composition-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .composition-table {
    grid-area: 3 / 1;
  }
  .composition-heading {
    flex-wrap: wrap;
  }
}
</style>
