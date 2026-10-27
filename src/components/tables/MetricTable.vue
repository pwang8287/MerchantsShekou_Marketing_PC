<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Download, Search } from '@element-plus/icons-vue';
import type { AggregateRow, MetricKey } from '../../types';
import { metricDefs, displayMetric, summarize, fmt } from '../../utils/metrics';
import { exportCsv } from '../../utils/export';
import { useDashboardStore } from '../../stores/dashboard';
const props = withDefaults(
  defineProps<{
    rows: AggregateRow[];
    title?: string;
    nameLabel?: string;
    metrics?: MetricKey[];
    compact?: boolean;
  }>(),
  {
    title: '项目营销明细',
    nameLabel: '项目名称',
    metrics: () => [
      'amount',
      'completion',
      'collection',
      'leads',
      'visits',
      'contracts',
      'conversion',
    ],
    compact: false,
  },
);
const store = useDashboardStore();
const search = ref('');
const page = ref(1);
const pageSize = ref(5);
const sort = ref<{ prop: string; order: string | null }>({ prop: 'amount', order: 'descending' });
const filtered = computed(() => {
  const r = props.rows.filter((r) => r.name.includes(search.value));
  const key = sort.value.prop as MetricKey;
  return sort.value.order
    ? [...r].sort((a, b) => (a[key] - b[key]) * (sort.value.order === 'ascending' ? 1 : -1))
    : r;
});
const paged = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);
watch([() => props.rows, search, pageSize], () => (page.value = 1));
function download() {
  exportCsv(
    props.title,
    [
      props.nameLabel,
      ...props.metrics.map((k) => `${metricDefs[k].label}（${metricDefs[k].unit}）`),
    ],
    filtered.value.map((r) => [r.name, ...props.metrics.map((k) => displayMetric(r, k))]),
  );
}
function totals() {
  const s = summarize(filtered.value.flatMap((r) => r.records));
  return ['合计', ...props.metrics.map((k) => displayMetric(s, k))];
}
function onSort(value: { prop: string; order: string | null }) {
  sort.value = value;
}
const selectRow = (r: AggregateRow) => store.drill(r.name + ' · 营销明细', r.records);
</script>
<template>
  <section class="panel table-panel">
    <header class="panel-head">
      <div>
        <h3>
          {{ title }} <span class="count-badge">{{ filtered.length }}</span>
        </h3>
        <p v-if="!compact">点击项目查看业绩、转化及客户来源明细</p>
      </div>
      <div class="table-tools">
        <el-input
          v-model="search"
          :prefix-icon="Search"
          clearable
          :placeholder="'搜索' + nameLabel"
          aria-label="搜索明细"
        /><el-button :icon="Download" @click="download">导出 CSV</el-button>
      </div>
    </header>
    <el-table
      :data="paged"
      v-loading="store.loading"
      :show-summary="!compact"
      :summary-method="totals"
      :default-sort="{ prop: 'amount', order: 'descending' }"
      @sort-change="onSort"
      @row-click="selectRow"
      empty-text="当前筛选条件暂无数据"
      row-class-name="clickable-row"
      ><el-table-column prop="name" :label="nameLabel" min-width="190" fixed show-overflow-tooltip
        ><template #default="{ row }"
          ><span class="project-link">{{ row.name }}</span
          ><small v-if="!compact" class="row-subtitle"
            >{{ row.records[0]?.region }} · {{ row.records[0]?.city }}</small
          ></template
        ></el-table-column
      ><el-table-column
        v-for="k in metrics"
        :key="k"
        :prop="k"
        :label="`${metricDefs[k].label} (${metricDefs[k].unit})`"
        :min-width="k === 'completion' || k === 'conversion' ? 148 : 145"
        align="right"
        sortable="custom"
        ><template #default="{ row }"
          ><span v-if="k === 'completion'" :class="row.completion >= 100 ? 'positive' : 'negative'"
            >{{ displayMetric(row, k) }}%</span
          ><span v-else>{{ displayMetric(row, k) }}</span></template
        ></el-table-column
      ><template #empty><el-empty :image-size="65" description="当前条件暂无数据" /></template
    ></el-table>
    <footer class="table-footer">
      <span
        >共 {{ filtered.length }} 条 · 金额已按万元汇总
        <template v-if="filtered.length"
          >· 签约 {{ fmt(summarize(filtered.flatMap((r) => r.records)).contracts) }} 套</template
        ></span
      ><el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20]"
        :total="filtered.length"
        layout="sizes, prev, pager, next"
        small
        background
      />
    </footer>
  </section>
</template>
