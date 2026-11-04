<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../../charts/components/BaseChart.vue';
import type { Summary } from '../../../types';
import { useDashboardStore } from '../../../stores/dashboard';
import { filterRows, fmt, groupRows, summarize } from '../../../utils/metrics';
import CustomerStructureAnalysis from './CustomerStructureAnalysis.vue';

const store = useDashboardStore();
const route = useRoute();
const isProjectDetail = computed(() => route.name === 'project-marketing-detail');
const isCityDetail = computed(() => route.name === 'city-marketing-detail');
const projectLevel = computed(() => isCityDetail.value || isProjectDetail.value);
const headquarters = computed(() =>
  summarize(
    filterRows(store.rows, {
      ...store.filter,
      organization: '',
      organizationNames: [],
      region: '',
      city: '',
      project: '',
    }),
  ),
);
const visitToContractRate = (row: Summary) =>
  row.visitPeople ? (row.contracts / row.visitPeople) * 100 : null;
const headquartersRate = computed(() => visitToContractRate(headquarters.value));
function conversionClass(row: Summary) {
  const rate = visitToContractRate(row);
  if (rate === null || headquartersRate.value === null) return '';
  const difference = rate - headquartersRate.value;
  return difference > 1e-9 ? 'city-rate-above' : difference < -1e-9 ? 'city-rate-below' : '';
}
const columns = [
  { key: 'leads', label: '线索数量', unit: '组' },
  { key: 'visitPeople', label: '到访人数', unit: '人' },
  { key: 'subscriptionUnits', label: '认购套数', unit: '套' },
  { key: 'contracts', label: '签约套数', unit: '套' },
  {
    key: 'conversion',
    label: '到访至签约转化率',
    unit: '%',
    tip: '签约套数 ÷ 到访人数 × 100%；为期间业务量比值，不代表同批客户的追踪转化率。',
  },
  {
    key: 'acquisition',
    label: '单套签约获客成本',
    unit: '元/套',
    tip: '营销费用（万元）× 10,000 ÷ 签约套数；越低表示单位签约投入越少。',
  },
] as const;
type Key = (typeof columns)[number]['key'];
const sort = ref<{ prop: Key; order: string | null }>({ prop: 'contracts', order: 'descending' });
const rows = computed(() => {
  const matched = groupRows(store.filtered, projectLevel.value ? 'project' : 'organization');
  if (!sort.value.order) return matched;
  const key = sort.value.prop;
  const value = (r: Summary) =>
    key === 'conversion'
      ? visitToContractRate(r)
      : key === 'acquisition' && !r.contracts
        ? null
        : r[key];
  return matched.sort((a, b) => {
    const av = value(a),
      bv = value(b);
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    return (av - bv) * (sort.value.order === 'ascending' ? 1 : -1);
  });
});
const costChart = computed<EChartsOption>(() => ({
  color: ['#4c88ff'],
  tooltip: {
    trigger: 'axis',
    confine: true,
    axisPointer: { type: 'shadow' },
    valueFormatter: (value) =>
      value == null ? '无签约，暂不计算' : `${fmt(Number(value), 2)} 元/套`,
  },
  grid: { top: 48, left: 18, right: 24, bottom: 54, containLabel: true },
  xAxis: {
    type: 'category',
    name: projectLevel.value ? '项目' : '城市公司',
    nameLocation: 'middle',
    nameGap: 65,
    data: rows.value.map((r) => r.name),
    axisTick: { alignWithLabel: true },
    axisLabel: {
      interval: 0,
      rotate: 35,
      color: '#7e8da4',
      fontSize: 11,
      formatter: (name: string) => (projectLevel.value ? name.replace(/^.*?·/, '') : name),
    },
    axisLine: { lineStyle: { color: '#dce4f0' } },
  },
  yAxis: {
    type: 'value',
    name: '单套签约获客成本（元/套）',
    nameTextStyle: { color: '#7e8da4', align: 'left' },
    min: 0,
    axisLabel: { color: '#7e8da4' },
    splitLine: { lineStyle: { color: '#edf1f7', type: 'dashed' } },
  },
  series: [
    {
      name: '单套签约获客成本',
      type: 'bar',
      barMaxWidth: 34,
      cursor: 'default',
      itemStyle: { borderRadius: [5, 5, 0, 0] },
      data: rows.value.map((r) => (r.contracts ? +r.acquisition.toFixed(2) : null)),
    },
  ],
}));
function display(row: Summary, key: Key) {
  if ((key === 'conversion' && !row.visitPeople) || (key === 'acquisition' && !row.contracts))
    return '—';
  return (
    fmt(
      key === 'conversion' ? visitToContractRate(row)! : row[key],
      key === 'conversion' ? 1 : key === 'acquisition' ? 2 : 0,
    ) + (key === 'conversion' ? '%' : ` ${columns.find((column) => column.key === key)!.unit}`)
  );
}
function totals() {
  const total = summarize(rows.value.flatMap((r) => r.records));
  return ['合计', ...columns.map((column) => display(total, column.key))];
}
function onSort(next: { prop: Key; order: string | null }) {
  sort.value = next;
}
</script>

<template>
  <CustomerStructureAnalysis v-if="isProjectDetail" />
  <section v-else class="panel table-panel city-conversion-panel">
    <header class="panel-head">
      <div>
        <h3>
          {{ isCityDetail ? '项目转化链路对比' : '城市公司转化链路对比' }}
          <span class="count-badge">{{ rows.length }}</span>
        </h3>
        <p>获客 → 到访 → 认购 → 签约 · 按当前日期、组织与渠道筛选汇总</p>
      </div>
    </header>
    <div class="city-comparison-layout">
      <div class="city-cost-panel">
        <BaseChart
          :option="costChart"
          :height="360"
          :empty="!rows.length"
          :loading="store.loading"
          unit="元/套"
        />
      </div>
      <div class="city-detail-panel">
        <el-table
          size="small"
          :data="rows"
          v-loading="store.loading"
          show-summary
          :summary-method="totals"
          :default-sort="{ prop: 'contracts', order: 'descending' }"
          @sort-change="onSort"
          :empty-text="projectLevel ? '当前筛选条件暂无项目数据' : '当前筛选条件暂无城市公司数据'"
        >
          <el-table-column
            :label="projectLevel ? '项目名称' : '城市公司'"
            prop="name"
            :min-width="projectLevel ? 150 : 100"
            fixed
            show-overflow-tooltip
            ><template #default="{ row }"
              ><router-link
                class="company-project-link"
                :to="
                  isCityDetail
                    ? {
                        name: 'project-marketing-detail',
                        params: { project: row.name },
                        query: { company: String(route.params.organization) },
                      }
                    : { name: 'city-marketing-detail', params: { organization: row.name } }
                "
                >{{ row.name }}</router-link
              ></template
            ></el-table-column
          >
          <el-table-column
            v-for="column in columns"
            :key="column.key"
            :prop="column.key"
            :label="column.label"
            :min-width="column.key === 'acquisition' ? 155 : column.key === 'conversion' ? 155 : 85"
            align="right"
            sortable="custom"
            ><template #header
              ><el-tooltip
                v-if="'tip' in column"
                :content="column.tip"
                placement="top"
                :show-after="200"
                ><span class="city-column-help">{{ column.label }} ⓘ</span></el-tooltip
              ><span v-else>{{ column.label }}</span></template
            ><template #default="{ row }"
              ><span
                :class="column.key === 'conversion' ? ['city-rate', conversionClass(row)] : ''"
                >{{ display(row, column.key) }}</span
              ></template
            ></el-table-column
          >
        </el-table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.company-project-link {
  color: #487df0;
  text-decoration: none;
  font-size: 12px;
}
.city-comparison-layout {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(0, 2fr);
  gap: 20px;
  align-items: stretch;
}
.city-detail-panel,
.city-cost-panel {
  min-width: 0;
}
.city-cost-panel {
  padding-right: 20px;
  border-right: 1px solid #edf1f7;
}
.city-detail-panel :deep(.el-table) {
  font-size: 12px;
}
.city-detail-panel :deep(.el-table th.el-table__cell) {
  padding: 7px 0;
  font-size: 12px;
}
.city-detail-panel :deep(.el-table td.el-table__cell) {
  padding: 6px 0;
}
.city-detail-panel :deep(.el-table .cell) {
  padding: 0 5px;
  line-height: 20px;
  white-space: nowrap;
}
.city-detail-panel :deep(.el-button.is-link) {
  font-size: 12px;
  padding: 2px 0;
}
.city-detail-panel :deep(.el-table__footer-wrapper td.el-table__cell) {
  padding: 6px 0;
}
.city-detail-panel {
  overflow: hidden;
}
.city-conversion-panel .panel-head {
  flex-wrap: wrap;
  gap: 12px;
}
.city-conversion-panel .panel-head p {
  margin: 7px 0 0;
  color: #8996ab;
  font-size: 12px;
}
@media (max-width: 1320px) {
  .city-comparison-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .city-cost-panel {
    padding-right: 0;
    border-right: 0;
    border-bottom: 1px solid #edf1f7;
    padding-bottom: 16px;
  }
}
.city-rate {
  display: inline-block;
  border-radius: 5px;
  padding: 2px 6px;
  font-weight: 600;
}
.city-rate-above {
  color: #527dcc;
  background: #eff5ff;
}
.city-rate-below {
  color: #8792a2;
  background: #f5f6f8;
}
.city-column-help {
  cursor: help;
}
</style>
