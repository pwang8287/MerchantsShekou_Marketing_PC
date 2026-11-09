<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AggregateRow, MarketingPerformanceMetric } from '../../types';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../charts/components/BaseChart.vue';
import { bubbleColor } from '../../charts/themes/bubbles';
import { useDashboardStore } from '../../stores/dashboard';
import { fmt, groupRows, summarize, filterRows } from '../../utils/metrics';

import { channelAverageRow, isChannelAverage } from '../../utils/channelAverage';
import { sortChannelTable, type ChannelTableSort } from '../../utils/channelTableSort';
const tableSort = ref<ChannelTableSort>({ prop: '', order: null });
const props = defineProps<{ rows: MarketingPerformanceMetric[] }>();
const store = useDashboardStore();
const channels = computed(() => groupRows(props.rows, 'channel'));
const unsortedTableRows = computed(() => {
  const average = channelAverageRow(channels.value);
  return average ? [...channels.value, average] : channels.value;
});
const total = computed(() => summarize(props.rows));
const projectRows = computed(() => {
  const projects = new Set(props.rows.map((row) => row.project));
  return filterRows(store.rows, {
    ...store.filter,
    organization: '',
    organizationNames: [],
    region: '',
    city: '',
    project: '',
  }).filter((row) => projects.has(row.project));
});
const projectChannels = computed(
  () => new Map(groupRows(projectRows.value, 'channel').map((row) => [row.name, row])),
);
const percent = (contracts: number, visits: number) =>
  visits ? fmt((contracts / visits) * 100, 1) + '%' : '—';
const projectRate = (name: string) => {
  const row = name === '平均值' ? summarize(projectRows.value) : projectChannels.value.get(name);
  return row ? percent(row.contracts, row.visitPeople) : '—';
};
const tableRows = computed(() =>
  sortChannelTable(unsortedTableRows.value, tableSort.value, (row, key) => {
    if (key === 'share')
      return total.value.contracts ? row.contracts / total.value.contracts : null;
    if (key === 'rate') return row.visitPeople ? row.contracts / row.visitPeople : null;
    if (key === 'projectRate') {
      const project = projectChannels.value.get(row.name);
      return project?.visitPeople ? project.contracts / project.visitPeople : null;
    }
    return row[key as keyof typeof row] as string | number;
  }),
);
const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    appendToBody: true,
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    textStyle: { color: '#14243d', fontSize: 12 },
    formatter: '{b}<br/>签约套数：{c} 套<br/>占比：{d}%',
  },
  legend: { show: false },
  graphic: [
    {
      type: 'text',
      left: 'center',
      top: 'middle',
      style: { text: '签约套数构成', fontSize: 13, fill: '#14243d' },
    },
  ],
  series: [
    {
      type: 'pie',
      radius: ['53%', '76%'],
      center: ['50%', '50%'],
      label: { show: false },
      cursor: 'default',
      itemStyle: { borderColor: '#fff', borderWidth: 3 },
      data: channels.value.map((row) => ({
        name: row.name,
        value: row.contracts,
        itemStyle: { color: bubbleColor(row.name) },
      })),
    },
  ],
}));
const rateColumns = [
  { label: '到访至签约转化率', numerator: 'contracts', denominator: 'visitPeople' },
] as const;
type RateColumn = (typeof rateColumns)[number];
function percentage(row: typeof total.value, column: RateColumn) {
  return row[column.denominator]
    ? fmt((row[column.numerator] / row[column.denominator]) * 100, 1) + '%'
    : '—';
}
function channelRowClass({ row }: { row: AggregateRow }) {
  return isChannelAverage(row) ? 'channel-average-row' : '';
}
function totals() {
  return [
    '合计',
    fmt(total.value.visitPeople) + ' 人',
    fmt(total.value.subscriptionUnits) + ' 套',
    fmt(total.value.contracts) + ' 套',
    percent(total.value.contracts, total.value.contracts),
    ...rateColumns.map((column) => percentage(total.value, column)),
    percent(summarize(projectRows.value).contracts, summarize(projectRows.value).visitPeople),
  ];
}
</script>

<template>
  <section class="panel advisor-channel-analysis">
    <header class="panel-head"><h3>渠道转化分析</h3></header>
    <div class="channel-analysis-body">
      <BaseChart :option="option" :height="280" :empty="!total.contracts" unit="套" />
      <el-table
        :data="tableRows"
        class="channel-legend-table"
        @sort-change="tableSort = $event"
        :row-class-name="channelRowClass"
        show-summary
        :summary-method="totals"
        size="small"
      >
        <el-table-column prop="name" sortable="custom" label="渠道" min-width="90">
          <template #default="{ row }"
            ><span class="channel-name"
              ><i v-if="!isChannelAverage(row)" :style="{ background: bubbleColor(row.name) }" />{{
                row.name
              }}</span
            ></template
          >
        </el-table-column>
        <el-table-column
          v-for="column in [
            { key: 'visitPeople', label: '到访人数', unit: '人' },
            { key: 'subscriptionUnits', label: '认购套数', unit: '套' },
            { key: 'contracts', label: '签约套数', unit: '套' },
          ] as const"
          :key="column.key"
          :prop="column.key"
          sortable="custom"
          :label="column.label"
          align="right"
          min-width="74"
        >
          <template #default="{ row }"
            >{{ fmt(row[column.key], isChannelAverage(row) ? 2 : 0) }} {{ column.unit }}</template
          >
        </el-table-column>
        <el-table-column
          label="签约占比"
          prop="share"
          sortable="custom"
          align="right"
          min-width="70"
        >
          <template #default="{ row }">{{ percent(row.contracts, total.contracts) }}</template>
        </el-table-column>
        <el-table-column
          v-for="column in rateColumns"
          :key="column.label"
          prop="rate"
          sortable="custom"
          :label="column.label"
          align="right"
          min-width="112"
        >
          <template #default="{ row }">{{ percentage(row, column) }}</template>
        </el-table-column>
        <el-table-column
          label="项目到访至签约转化率"
          prop="projectRate"
          sortable="custom"
          align="right"
          min-width="138"
        >
          <template #header
            ><el-tooltip
              content="同统计周期、同渠道的项目签约套数 ÷ 到访人数 × 100%"
              placement="top"
              ><span>项目到访至签约转化率 ⓘ</span></el-tooltip
            ></template
          >
          <template #default="{ row }">{{ projectRate(row.name) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </section>
</template>

<style scoped>
.advisor-channel-analysis {
  padding: 16px;
  margin-bottom: 16px;
  min-width: 0;
}
.channel-analysis-body {
  display: grid;
  grid-template-columns: minmax(160px, 22%) minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}
.channel-name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.channel-name i {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  flex-shrink: 0;
}
.panel-head {
  margin-bottom: 12px;
}
:deep(.el-table) {
  font-size: 11px;
}
:deep(.el-table .cell) {
  padding: 0 5px;
  white-space: nowrap;
  font-size: 11px;
  line-height: 20px;
}
:deep(.el-table th.el-table__cell),
:deep(.el-table td.el-table__cell) {
  padding: 6px 0;
}
</style>
