<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Download, Search } from '@element-plus/icons-vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { fmt, filterRows, summarize } from '../../../utils/metrics';
import { exportCsv } from '../../../utils/export';
import { buildAdvisorDataRows } from '../../../utils/advisorData';
import { projectSalesStatuses, type ProjectSalesStatus } from '../../../mocks/projectSalesStatus';
import {
  buildProjectDataRows,
  projectDataColumns,
  type ProjectDataKey,
  type ProjectDataRow,
} from '../../../utils/projectDataTable';
const store = useDashboardStore();
const advisorMode = computed(() => !!store.projectScope);
const tableTitle = computed(() => (advisorMode.value ? '顾问数据明细' : '项目数据明细'));
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
const pageSize = ref(5);
const sort = ref<{ prop: ProjectDataKey; order: string | null }>({
  prop: 'amount',
  order: 'descending',
});
const data = computed(() =>
  advisorMode.value
    ? buildAdvisorDataRows(store.rows, store.filter)
    : buildProjectDataRows(store.rows, store.filter),
);
const matched = computed(() =>
  data.value.filter(
    (r) =>
      r.name.includes(search.value.trim()) &&
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
function display(row: ProjectDataRow, key: ProjectDataKey) {
  const column = projectDataColumns.find((c) => c.key === key)!;
  const value = row[key];
  return value === null
    ? '-'
    : `${fmt(value, column.digits)}${column.unit === '%' ? '%' : ' ' + column.unit}`;
}
function onSort(value: { prop: ProjectDataKey; order: string | null }) {
  sort.value = value;
}
function download() {
  exportCsv(
    tableTitle.value,
    [nameLabel.value, ...projectDataColumns.map((c) => `${c.label}（${c.unit}）`)],
    sorted.value.map((row) => [row.name, ...projectDataColumns.map((c) => display(row, c.key))]),
  );
}
</script>
<template>
  <section class="panel table-panel project-data-table">
    <header class="panel-head">
      <div>
        <h3>
          {{ tableTitle }} <span class="count-badge">{{ matched.length }}</span>
        </h3>
        <p v-if="!advisorMode">点击项目名称查看项目营销分析</p>
      </div>
      <div class="table-tools">
        <el-input
          v-model="search"
          :prefix-icon="Search"
          clearable
          :placeholder="'搜索' + nameLabel"
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
          ><small class="row-subtitle">{{
            advisorMode
              ? row.records[0]?.project
              : row.records[0]?.region + ' · ' + row.records[0]?.city
          }}</small></template
        ></el-table-column
      >
      <el-table-column
        v-for="column in projectDataColumns"
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
      <span>共 {{ matched.length }} {{ advisorMode ? '位顾问' : '个项目' }}</span
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
