<script setup lang="ts">
import { computed } from 'vue';
import type { MarketingPerformanceMetric } from '../../types';
import { fmt, groupRows, summarize } from '../../utils/metrics';

const props = defineProps<{ rows: MarketingPerformanceMetric[]; projectLevel: boolean }>();
const groups = computed(() =>
  groupRows(props.rows, props.projectLevel ? 'project' : 'organization'),
);
const columns = [
  { key: 'leads', label: '线索数量', unit: '组' },
  { key: 'visitPeople', label: '到访人数', unit: '人' },
  { key: 'subscriptionUnits', label: '认购套数', unit: '套' },
  { key: 'contracts', label: '签约套数', unit: '套' },
] as const;
const rate = (contracts: number, visits: number) =>
  visits ? fmt((contracts / visits) * 100, 1) + '%' : '—';
function totals() {
  const total = summarize(props.rows);
  return [
    '合计',
    ...columns.map((column) => fmt(total[column.key]) + ' ' + column.unit),
    fmt(total.amount, 2),
    rate(total.contracts, total.visitPeople),
  ];
}
</script>

<template>
  <section class="channel-organization-panel">
    <header class="panel-head">
      <h3>{{ projectLevel ? '项目渠道转化明细' : '城市公司渠道转化明细' }}</h3>
    </header>
    <el-table
      :data="groups"
      show-summary
      :summary-method="totals"
      size="small"
      empty-text="当前筛选条件暂无数据"
    >
      <el-table-column
        prop="name"
        :label="projectLevel ? '项目名称' : '城市公司'"
        min-width="180"
      />
      <el-table-column
        v-for="column in columns"
        :key="column.key"
        :label="column.label"
        min-width="80"
        align="right"
      >
        <template #default="{ row }">{{ fmt(row[column.key]) }} {{ column.unit }}</template>
      </el-table-column>
      <el-table-column label="签约金额(万元)" min-width="110" align="right">
        <template #default="{ row }">{{ fmt(row.amount, 2) }}</template>
      </el-table-column>
      <el-table-column label="到访至签约转化率" min-width="130" align="right">
        <template #default="{ row }">{{ rate(row.contracts, row.visitPeople) }}</template>
      </el-table-column>
    </el-table>
  </section>
</template>

<style scoped>
.channel-organization-panel {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  min-width: 0;
}
.panel-head {
  margin-bottom: 12px;
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
