<script setup lang="ts">
import { computed, ref } from 'vue';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../../charts/components/BaseChart.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import {
  buildCustomerStructure,
  type CustomerStructureRow,
} from '../../../utils/customerStructure';
import { filterRows, fmt, summarize } from '../../../utils/metrics';
import type { MarketingPerformanceMetric } from '../../../types';
const props = withDefaults(
  defineProps<{ records?: MarketingPerformanceMetric[]; title?: string }>(),
  {
    title: '客户结构分析',
  },
);
const store = useDashboardStore();
const columns = [
  { key: 'visits', label: '到访人数', unit: '人', digits: 0, width: 95 },
  { key: 'visitShare', label: '到访占比', unit: '%', digits: 1, width: 90 },
  { key: 'subscriptions', label: '认购套数', unit: '套', digits: 0, width: 95 },
  { key: 'contracts', label: '签约套数', unit: '套', digits: 0, width: 95 },
  { key: 'conversion', label: '到访至签约转化率', unit: '%', digits: 1, width: 155 },
] as const;
type Key = (typeof columns)[number]['key'];
const sort = ref<{ prop: Key; order: string | null }>({ prop: 'visits', order: 'descending' });
function onSort(value: { prop: Key; order: string | null }) {
  sort.value = value;
}
const rows = computed(() => {
  const data = buildCustomerStructure(props.records ?? store.filtered);
  if (!sort.value.order) return data;
  const direction = sort.value.order === 'ascending' ? 1 : -1;
  return data.sort((a, b) => {
    const av = a[sort.value.prop],
      bv = b[sort.value.prop];
    return av === null ? (bv === null ? 0 : 1) : bv === null ? -1 : (av - bv) * direction;
  });
});
const nationalRate = computed(() => {
  const total = summarize(
    filterRows(store.rows, {
      ...store.filter,
      organization: '',
      organizationNames: [],
      region: '',
      city: '',
      project: '',
    }),
  );
  return total.visitPeople ? (total.contracts / total.visitPeople) * 100 : null;
});
function conversionClass(rate: number | null) {
  if (rate === null || nationalRate.value === null) return '';
  const diff = rate - nationalRate.value;
  return diff > 1e-9 ? 'rate-above' : diff < -1e-9 ? 'rate-below' : '';
}
function display(row: CustomerStructureRow, key: Key) {
  const value = row[key];
  const column = columns.find((item) => item.key === key)!;
  return value === null
    ? '—'
    : fmt(value, column.digits) + (column.unit === '%' ? '%' : ` ${column.unit}`);
}
function totals() {
  const visits = rows.value.reduce((sum, row) => sum + row.visits, 0);
  const contracts = rows.value.reduce((sum, row) => sum + row.contracts, 0);
  const total: CustomerStructureRow = {
    name: '合计',
    visits,
    subscriptions: rows.value.reduce((sum, row) => sum + row.subscriptions, 0),
    contracts,
    visitShare: visits ? 100 : null,
    conversion: visits ? (contracts / visits) * 100 : null,
  };
  return ['合计', ...columns.map((column) => display(total, column.key))];
}
const chart = computed<EChartsOption>(() => ({
  grid: {
    left: 12,
    right: 16,
    top: 38,
    bottom: rows.value.length > 4 ? 64 : 48,
    containLabel: true,
  },
  tooltip: {
    trigger: 'axis',
    renderMode: 'html',
    appendTo: 'body',
    confine: false,
    className: 'dashboard-floating-tooltip',
    transitionDuration: 0,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    textStyle: { color: '#43546e', fontSize: 12 },
    formatter: (input: unknown) => {
      const point = (Array.isArray(input) ? input[0] : input) as { dataIndex: number };
      const row = rows.value[point.dataIndex];
      return row
        ? `<b>${row.name}</b><br/>${columns.map((column) => `${column.label}：${display(row, column.key)}`).join('<br/>')}`
        : '';
    },
  },
  xAxis: {
    type: 'category',
    name: '目标户型',
    nameLocation: 'middle',
    nameGap: rows.value.length > 4 ? 46 : 30,
    nameTextStyle: { color: '#7186a4', fontSize: 11 },
    data: rows.value.map((row) => row.name),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#dce5f2' } },
    axisLabel: {
      color: '#7186a4',
      fontSize: 10,
      interval: 0,
      rotate: rows.value.length > 4 ? 30 : 0,
    },
  },
  yAxis: {
    type: 'value',
    name: '到访人数（人）',
    nameGap: 18,
    nameTextStyle: { color: '#7186a4', fontSize: 11, align: 'left' },
    minInterval: 1,
    axisLabel: { color: '#7186a4', fontSize: 11 },
    splitLine: { lineStyle: { color: '#edf1f7', type: 'dashed' } },
  },
  series: [
    {
      type: 'bar',
      cursor: 'default',
      barMaxWidth: 32,
      itemStyle: { color: '#4f83ff', borderRadius: [5, 5, 0, 0] },
      label: {
        show: true,
        position: 'top',
        color: '#527dcc',
        fontSize: 10,
        formatter: (point) => fmt(Number(point.value)),
      },
      data: rows.value.map((row) => row.visits),
    },
  ],
}));
</script>
<template>
  <section class="panel customer-structure-panel">
    <header class="panel-head">
      <h3>
        {{ title }} <span class="count-badge">{{ rows.length }}</span>
      </h3>
    </header>
    <div class="customer-structure-layout">
      <div class="customer-structure-chart">
        <BaseChart
          :option="chart"
          :height="Math.max(260, Math.min(360, 68 + rows.length * 34))"
          :empty="!rows.length"
          :loading="store.loading"
          unit="人"
        />
      </div>
      <el-table
        :data="rows"
        size="small"
        show-summary
        :summary-method="totals"
        :default-sort="{ prop: 'visits', order: 'descending' }"
        @sort-change="onSort"
        empty-text="当前筛选条件暂无客户数据"
      >
        <el-table-column prop="name" label="目标户型" min-width="140" />
        <el-table-column
          v-for="column in columns"
          :key="column.key"
          :prop="column.key"
          :label="column.label"
          :min-width="column.width"
          align="right"
          sortable="custom"
        >
          <template #header
            ><el-tooltip
              v-if="column.key === 'conversion'"
              content="签约套数 ÷ 到访人数 × 100%；与同周期总部转化率比较，高于总部为蓝色，低于总部为灰色。"
              placement="top"
              ><span>{{ column.label }} ⓘ</span></el-tooltip
            ><span v-else>{{ column.label }}</span></template
          >
          <template #default="{ row }"
            ><span
              :class="
                column.key === 'conversion'
                  ? ['conversion-rate', conversionClass(row.conversion)]
                  : ''
              "
              >{{ display(row, column.key) }}</span
            ></template
          >
        </el-table-column>
      </el-table>
    </div>
  </section>
</template>
<style scoped>
.customer-structure-panel {
  padding: 16px;
  margin-bottom: 16px;
}
.customer-structure-panel > .panel-head {
  margin-bottom: 16px;
}
.customer-structure-layout {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr);
  gap: 20px;
  align-items: center;
}
.customer-structure-chart {
  min-width: 0;
  padding-right: 16px;
  border-right: 1px solid #edf1f7;
}
.customer-structure-panel :deep(.el-table .cell) {
  padding: 0 5px;
  white-space: nowrap;
  font-size: 11px;
  line-height: 20px;
}
.customer-structure-layout > .el-table {
  min-width: 0;
  width: 100%;
}
.customer-structure-panel :deep(.el-table th.el-table__cell) {
  padding: 6px 0;
}
.customer-structure-panel :deep(.el-table td.el-table__cell) {
  padding: 6px 0;
}
.conversion-rate {
  display: inline-block;
  border-radius: 5px;
  padding: 2px 6px;
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
@media (max-width: 1250px) {
  .customer-structure-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .customer-structure-chart {
    border-right: 0;
    padding-right: 0;
  }
}
</style>
