<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Download, Search } from '@element-plus/icons-vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { fmt, filterRows, summarize } from '../../../utils/metrics';
import { exportCsv } from '../../../utils/export';
import { buildAdvisorDataRows, buildAdvisorProjectRows } from '../../../utils/advisorData';
import { simulatedDealCycle } from '../../../utils/dealCycle';
import { projectSalesStatuses, type ProjectSalesStatus } from '../../../mocks/projectSalesStatus';
import {
  buildProjectDataRows,
  projectDataColumns,
  type ProjectDataKey,
  type ProjectDataRow,
} from '../../../utils/projectDataTable';
type TableKey = ProjectDataKey | 'revisitRate' | 'dealCycle';
const props = withDefaults(defineProps<{ advisorList?: boolean; projects?: string[] }>(), {
  advisorList: false,
});
type TableRow = ProjectDataRow & { revisitRate: number | null; dealCycle: number | null };
const dealCycleColumn = {
  key: 'dealCycle' as const,
  label: '平均成交周期',
  unit: '天',
  digits: 1,
  width: 110,
  note: '客户首次留资至签约的模拟天数，按签约套数加权；与顾问转化分析弹窗口径一致。',
};
const revisitColumn = {
  key: 'revisitRate' as const,
  label: '复访率',
  unit: '%',
  digits: 2,
  width: 100,
  note: '所选周期内复访客户人数 ÷ 到访客户人数 × 100%；当前为模拟数据。',
};
// 按顾问及来源生成稳定的复访人数，再按到访人数加权汇总。
function revisitRate(row: ProjectDataRow) {
  let returned = 0;
  for (const fact of row.records) {
    const key = [fact.advisor, fact.project, fact.period, fact.channelDetailId, fact.customer].join(
      '|',
    );
    const seed = [...key].reduce((value, char) => (value * 31 + char.charCodeAt(0)) % 100003, 7);
    returned += Math.round(((fact.visitPeople || 0) * (25 + (seed % 46))) / 100);
  }
  return row.visitPeople ? (returned / row.visitPeople) * 100 : null;
}
const store = useDashboardStore();
const advisorMode = computed(() => props.advisorList || !!store.projectScope);
const showAdvisorTabs = computed(() => !!store.projectScope && !props.advisorList);
const advisorTab = ref<'advisor' | 'self'>('advisor');
const selfChannelMode = computed(() => showAdvisorTabs.value && advisorTab.value === 'self');
const detailFilter = computed(() =>
  selfChannelMode.value
    ? { ...store.filter, channel: '自渠自拓', channelObject: '', channelDetail: '' }
    : store.filter,
);
const columns = computed(() => {
  if (selfChannelMode.value)
    return [
      { key: 'leads' as const, label: '推荐量', unit: '组', digits: 0, width: 120 },
      { key: 'visitPeople' as const, label: '推荐到访人数', unit: '人', digits: 0, width: 140 },
      { key: 'contracts' as const, label: '推荐成交套数', unit: '套', digits: 0, width: 140 },
    ];
  if (!advisorMode.value) return [...projectDataColumns];
  const keys = [
    'annualCompletion',
    'amount',
    'visitPeople',
    'subscriptionUnits',
    'contracts',
    'visitConversion',
  ];
  return [
    ...keys.map((key) => {
      const column = projectDataColumns.find((column) => column.key === key)!;
      return key === 'visitPeople' ? { ...column, label: '接待人数' } : column;
    }),
    revisitColumn,
    dealCycleColumn,
  ];
});
const tableTitle = computed(() =>
  props.advisorList
    ? '顾问清单'
    : selfChannelMode.value
      ? '自渠数据'
      : advisorMode.value
        ? '顾问数据明细'
        : '项目数据明细',
);
const nameLabel = computed(() => (advisorMode.value ? '顾问名称' : '项目名称'));
const headquartersRate = computed(() => {
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
  if (rate === null || headquartersRate.value === null) return '';
  const difference = rate - headquartersRate.value;
  return difference > 1e-9 ? 'project-rate-above' : difference < -1e-9 ? 'project-rate-below' : '';
}
const search = ref('');
const salesStatus = ref<'全部' | ProjectSalesStatus>('全部');
const page = ref(1);
const pageSize = ref(props.advisorList ? 10 : 5);
const sort = ref<{ prop: TableKey; order: string | null }>({
  prop: 'amount',
  order: 'descending',
});
watch(advisorTab, () => {
  search.value = '';
  page.value = 1;
  sort.value = { prop: selfChannelMode.value ? 'contracts' : 'amount', order: 'descending' };
});
const data = computed<TableRow[]>(() =>
  (props.advisorList
    ? buildAdvisorProjectRows(store.rows, store.filter)
    : advisorMode.value
      ? buildAdvisorDataRows(store.rows, detailFilter.value)
      : buildProjectDataRows(store.rows, store.filter)
  )
    .filter(
      (row) => !props.projects || props.projects.includes(row.records[0]?.project || row.name),
    )
    .map((row) => ({
      ...row,
      revisitRate: advisorMode.value ? revisitRate(row) : null,
      dealCycle: advisorMode.value ? simulatedDealCycle(row.records) : null,
    })),
);
const matched = computed(() =>
  data.value.filter(
    (r) =>
      (r.name + (props.advisorList ? r.records[0]?.project || '' : '')).includes(
        search.value.trim(),
      ) &&
      (advisorMode.value || salesStatus.value === '全部' || r.salesStatus === salesStatus.value),
  ),
);
const sorted = computed(() => {
  if (!sort.value.order) return matched.value;
  return [...matched.value].sort((a, b) => {
    const av = a[sort.value.prop],
      bv = b[sort.value.prop];
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    return (av - bv) * (sort.value.order === 'ascending' ? 1 : -1);
  });
});
const paged = computed(() =>
  sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);
watch([data, search, salesStatus, pageSize], () => (page.value = 1));
function display(row: TableRow, key: TableKey) {
  const column = columns.value.find((c) => c.key === key)!;
  const value = row[key];
  return value === null
    ? '-'
    : `${fmt(value, column.digits)}${column.unit === '%' ? '%' : ' ' + column.unit}`;
}
function onSort(value: { prop: TableKey; order: string | null }) {
  sort.value = value;
}
function download() {
  exportCsv(
    tableTitle.value,
    [
      nameLabel.value,
      ...(props.advisorList ? ['项目'] : []),
      ...columns.value.map((c) => `${c.label}（${c.unit}）`),
    ],
    sorted.value.map((row) => [
      row.name,
      ...(props.advisorList ? [row.records[0]?.project || ''] : []),
      ...columns.value.map((c) => display(row, c.key)),
    ]),
  );
}
</script>
<template>
  <section class="panel table-panel project-data-table">
    <header class="panel-head">
      <div>
        <div
          v-if="showAdvisorTabs"
          class="advisor-data-tabs"
          role="tablist"
          aria-label="顾问数据类型"
        >
          <button
            role="tab"
            :aria-selected="advisorTab === 'advisor'"
            :class="{ active: advisorTab === 'advisor' }"
            @click="advisorTab = 'advisor'"
          >
            顾问数据
          </button>
          <button
            role="tab"
            :aria-selected="advisorTab === 'self'"
            :class="{ active: advisorTab === 'self' }"
            @click="advisorTab = 'self'"
          >
            自渠数据
          </button>
        </div>
        <h3 v-else>
          {{ tableTitle }} <span class="count-badge">{{ matched.length }}</span>
        </h3>
        <p v-if="!advisorMode">点击项目名称查看项目营销分析</p>
      </div>
      <div class="table-tools">
        <el-input
          v-model="search"
          :prefix-icon="Search"
          clearable
          :placeholder="props.advisorList ? '搜索顾问或项目名称' : '搜索' + nameLabel"
          :aria-label="'搜索' + nameLabel"
        />
        <el-radio-group
          v-if="!advisorMode"
          v-model="salesStatus"
          class="project-status-switch"
          aria-label="项目开盘状态"
        >
          <el-radio-button
            v-for="status in ['全部', ...projectSalesStatuses]"
            :key="status"
            :value="status"
            >{{
              status === '新开盘' ? '新盘' : status === '持续销售' ? '持销' : status
            }}</el-radio-button
          >
        </el-radio-group>
        <el-button :icon="Download" @click="download">导出 CSV</el-button>
      </div>
    </header>
    <el-table
      :data="paged"
      v-loading="store.loading"
      :default-sort="{ prop: 'amount', order: 'descending' }"
      @sort-change="onSort"
      :empty-text="advisorMode ? '当前筛选条件暂无顾问数据' : '当前筛选条件暂无项目数据'"
    >
      <el-table-column :label="nameLabel" prop="name" min-width="176" show-overflow-tooltip
        ><template #default="{ row }"
          ><button
            v-if="advisorMode"
            class="project-link advisor-link"
            @click="store.drill(row.name + ' · 顾问明细', row.records)"
          >
            {{ row.name }}
          </button>
          <router-link
            v-else
            class="project-link"
            :to="{
              name: 'project-marketing-detail',
              params: { project: row.name },
              query: store.cityScope ? { company: store.cityScope } : {},
            }"
            >{{ row.name }}</router-link
          ><small v-if="!props.advisorList" class="row-subtitle">{{
            advisorMode
              ? row.records[0]?.project
              : row.records[0]?.region + ' · ' + row.records[0]?.city
          }}</small></template
        ></el-table-column
      >
      <el-table-column v-if="props.advisorList" label="项目" min-width="175" show-overflow-tooltip>
        <template #default="{ row }">{{ row.records[0]?.project }}</template>
      </el-table-column>
      <el-table-column
        v-for="column in columns"
        :key="column.key"
        :prop="column.key"
        :label="column.label"
        :min-width="column.width"
        align="right"
        sortable="custom"
        ><template #header
          ><el-tooltip v-if="'note' in column" :content="column.note" placement="top"
            ><span>{{ column.label }} ⓘ</span></el-tooltip
          ><span v-else>{{ column.label }}</span></template
        ><template #default="{ row }"
          ><span
            :class="
              column.key === 'visitConversion'
                ? ['project-rate', conversionClass(row.visitConversion)]
                : ''
            "
            >{{ display(row, column.key) }}</span
          ></template
        ></el-table-column
      >
    </el-table>
    <footer class="table-footer">
      <span
        >共 {{ matched.length }}
        {{ props.advisorList ? '条顾问项目记录' : advisorMode ? '位顾问' : '个项目' }}</span
      ><el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20]"
        :total="matched.length"
        layout="sizes, prev, pager, next"
        small
        background
      />
    </footer>
  </section>
</template>
<style scoped>
.advisor-data-tabs {
  display: inline-flex;
  gap: 8px;
  align-items: stretch;
}
.advisor-data-tabs button {
  border: 0;
  border-top: 3px solid transparent;
  border-radius: 5px 5px 0 0;
  padding: 14px 20px;
  background: transparent;
  color: #7b8aa3;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.advisor-data-tabs button.active {
  border-top-color: #4285ff;
  background: #f3f7ff;
  color: #2878ff;
}
.advisor-link {
  border: 0;
  background: transparent;
  padding: 0;
}
.project-status-switch {
  display: inline-flex;
  height: var(--el-component-size, 32px);
  box-sizing: border-box;
  flex-wrap: nowrap;
  flex-shrink: 0;
  gap: 2px;
  padding: 3px;
  border: 1px solid #dfe5ef;
  border-radius: 5px;
  background: #f7f9fc;
}
.project-status-switch :deep(.el-radio-button) {
  height: 100%;
}
.project-status-switch :deep(.el-radio-button__inner) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 10px;
  border: 0 !important;
  border-radius: 4px !important;
  box-shadow: none !important;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  line-height: 16px;
}
.project-status-switch :deep(.el-radio-button.is-active .el-radio-button__inner) {
  background: #fff;
  color: #168bff;
  font-weight: 600;
  box-shadow: 0 1px 4px #10233f1a !important;
}
.project-data-table .project-link,
.project-data-table .project-link:hover {
  color: #487df0;
  text-decoration: none;
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
}
.project-data-table :deep(.el-table .cell) {
  white-space: nowrap;
  padding: 0 5px;
  font-size: 11px;
  line-height: 20px;
}
.project-data-table :deep(.el-table th .cell) {
  overflow: visible;
  text-overflow: clip;
}
.project-data-table :deep(.el-table td.el-table__cell) {
  padding: 6px 0;
}
.project-rate {
  display: inline-block;
  border-radius: 5px;
  padding: 2px 6px;
  font-weight: 600;
}
.project-rate-above {
  color: #527dcc;
  background: #eff5ff;
}
.project-rate-below {
  color: #8792a2;
  background: #f5f6f8;
}
.project-data-table .panel-head p {
  color: #8996ab;
  font-size: 12px;
  margin-top: 6px;
}
</style>
