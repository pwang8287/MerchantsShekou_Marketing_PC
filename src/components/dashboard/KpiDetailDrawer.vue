<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDashboardStore } from '../../stores/dashboard';
import { fmt, trendLabel } from '../../utils/metrics';
import { exportCsv } from '../../utils/export';
import {
  buildKpiDrilldown,
  formatKpiCell,
  kpiColumns,
  kpiDefinitions,
  kpiFactColumns,
  kpiFactValues,
  kpiSummaryCards,
} from '../../utils/kpiDrilldown';
import type { KpiDrillContext, KpiDrillRow, KpiDrillStep } from '../../types/kpiDrilldown';
const props = defineProps<{ context: KpiDrillContext }>();
const store = useDashboardStore();
const path = ref<KpiDrillStep[]>([]);
const tab = ref('breakdown');
const page = ref(1);
const pageSize = ref(10);
const sort = ref<{ key: string; order: string | null }>({ key: 'value', order: 'descending' });
const definition = computed(() => kpiDefinitions[props.context.key]);
const view = computed(() => buildKpiDrilldown(props.context, path.value));
const columns = computed(() => kpiColumns(props.context.key));
const factColumns = computed(() => kpiFactColumns(props.context.key));
const summaryCards = computed(() => kpiSummaryCards(view.value, props.context.key));
const contextLabel = computed(() => {
  const f = props.context.filter;
  const sample = props.context.rows.find(
    (r) =>
      (!f.channelObject || r.channelObjectId === f.channelObject) &&
      (!f.channelDetail || r.channelDetailId === f.channelDetail),
  );
  return [
    f.organization || '全部组织',
    f.region,
    f.city,
    f.project,
    f.channel,
    f.channelObject ? sample?.channelObject : '',
    f.channelDetail ? sample?.channelDetail : '',
    f.customer,
  ]
    .filter(Boolean)
    .join(' / ');
});
const sortedRows = computed(() => {
  const rows = [...view.value.children];
  if (sort.value.order)
    rows.sort(
      (a, b) =>
        ((a.values[sort.value.key] ?? -Infinity) - (b.values[sort.value.key] ?? -Infinity)) *
        (sort.value.order === 'ascending' ? 1 : -1),
    );
  return rows;
});
const pagedRows = computed(() =>
  sortedRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);
const sourceRows = computed(() =>
  view.value.currentRecords
    .slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
    .map((r) => ({ ...r, values: kpiFactValues(r, props.context.key) })),
);
const rowCount = computed(() =>
  tab.value === 'breakdown' ? view.value.children.length : view.value.currentRecords.length,
);
watch(
  () => props.context,
  () => {
    path.value = [];
    tab.value = 'breakdown';
    page.value = 1;
    sort.value = { key: 'value', order: 'descending' };
  },
  { immediate: true },
);
watch([view, tab, pageSize], () => {
  page.value = 1;
});
function descend(row: KpiDrillRow) {
  const level = view.value.level;
  if (!level) return;
  path.value = [...path.value, { field: level.field, id: row.id, label: row.name }];
  tab.value = path.value.length === 4 ? 'source' : 'breakdown';
}
function navigate(depth: number) {
  path.value = path.value.slice(0, depth);
  tab.value = depth >= 4 ? 'source' : 'breakdown';
}
function back() {
  if (path.value.length) navigate(path.value.length - 1);
  else store.kpiDetailVisible = false;
}
function totals() {
  return [
    '本层合计（全部页）',
    ...columns.value.map((column) => formatKpiCell(view.value.totals[column.key], column)),
  ];
}
function onSort(value: { prop: string; order: string | null }) {
  sort.value = { key: value.prop?.replace('values.', '') || 'value', order: value.order };
  page.value = 1;
}
function download() {
  const suffix = [
    definition.value.label,
    ...path.value.map((step) => step.label),
    tab.value === 'breakdown' ? '层级拆解' : '来源记录',
  ].join('_');
  const metricColumns = tab.value === 'breakdown' ? columns.value : factColumns.value;
  const headers = metricColumns.map((c) => `${c.label}（${c.unit}）`);
  if (tab.value === 'breakdown')
    exportCsv(
      suffix,
      [view.value.level?.label || '对象', ...headers],
      [
        ...sortedRows.value.map((row) => [
          row.name,
          ...metricColumns.map((c) => formatKpiCell(row.values[c.key], c)),
        ]),
        ['本层合计', ...metricColumns.map((c) => formatKpiCell(view.value.totals[c.key], c))],
      ],
    );
  else
    exportCsv(
      suffix,
      ['月份', '项目', '渠道大类', '供应商 / 平台', '细分触点', '客户类型', ...headers],
      view.value.currentRecords.map((row) => {
        const values = kpiFactValues(row, props.context.key);
        return [
          row.period,
          row.project,
          row.channel,
          row.channelObject,
          row.channelDetail,
          row.customer,
          ...metricColumns.map((c) => formatKpiCell(values[c.key], c)),
        ];
      }),
    );
}
</script>
<template>
  <el-drawer v-model="store.kpiDetailVisible" :title="definition.label + ' · 指标下钻'" size="88%">
    <div class="detail-context kpi-drill-context">
      <el-tag>继承指标卡筛选</el-tag
      ><span>{{ context.filter.period.join(' 至 ') }} · {{ context.filter.basis }}</span
      ><span>{{ contextLabel }}</span>
    </div>
    <div class="detail-kpis">
      <div
        v-for="(card, i) in summaryCards"
        :key="card.label"
        :class="{ 'kpi-drill-primary': i === 0 }"
      >
        <span>{{ card.label }}（{{ card.unit }}）</span><strong>{{ card.value }}</strong>
      </div>
    </div>
    <div class="kpi-drill-formula">
      <strong>指标口径</strong>
      <p>{{ definition.formula }}</p>
      <p v-if="context.key === 'completion'">
        子项对上级完成率贡献 = 子项签约金额 / 上级目标金额 ×
        100%，贡献合计等于上级完成率。差额在合计行按本层目标与实际净额重新计算。
      </p>
    </div>
    <div class="kpi-drill-comparison">
      <span
        >上年同期：{{ view.priorPeriod.join(' 至 ') }}
        <b>{{ trendLabel(view.totals.yoy ?? NaN) }}</b></span
      ><span
        >上期：{{ view.previousPeriod.join(' 至 ') }}
        <b>{{ trendLabel(view.totals.mom ?? NaN) }}</b></span
      >
    </div>
    <nav class="kpi-drill-breadcrumb" aria-label="指标下钻路径">
      <button @click="navigate(0)">{{ definition.label }} · 全部项目</button
      ><template v-for="(step, i) in path" :key="step.field"
        ><span>›</span><button @click="navigate(i + 1)">{{ step.label }}</button></template
      >
    </nav>
    <div class="kpi-drill-toolbar">
      <div>
        <h3>{{ tab === 'breakdown' ? (view.level?.label || '来源') + '拆解' : '来源数据' }}</h3>
        <p>
          {{
            tab === 'breakdown'
              ? '点击行继续按项目 → 渠道大类 → 供应商 / 平台 → 细分触点下钻'
              : '每行是月份 × 项目 × 渠道触点 × 客群的模拟汇总记录，不是逐笔合同或银行流水。'
          }}
        </p>
      </div>
      <el-radio-group v-if="view.level" v-model="tab" size="small"
        ><el-radio-button value="breakdown">层级拆解</el-radio-button
        ><el-radio-button value="source">来源数据</el-radio-button></el-radio-group
      >
    </div>
    <el-table
      v-if="tab === 'breakdown'"
      :key="context.key + '-' + path.length"
      :data="pagedRows"
      max-height="460"
      show-summary
      :summary-method="totals"
      :default-sort="{ prop: 'values.value', order: 'descending' }"
      row-class-name="clickable-row"
      @row-click="descend"
      @sort-change="onSort"
    >
      <el-table-column
        prop="name"
        :label="view.level?.label || '对象'"
        min-width="215"
        fixed
        show-overflow-tooltip
        ><template #default="{ row }"
          ><span class="project-link">{{ row.name }}</span
          ><span class="kpi-drill-row-arrow">›</span></template
        ></el-table-column
      >
      <el-table-column
        v-for="column in columns"
        :key="column.key"
        :prop="'values.' + column.key"
        :label="column.label + '（' + column.unit + '）'"
        :min-width="column.key === 'contribution' && context.key === 'completion' ? 205 : 160"
        align="right"
        sortable="custom"
        ><template #default="{ row }"
          ><span :class="{ 'kpi-drill-value': column.key === 'value' }">{{
            formatKpiCell(row.values[column.key], column)
          }}</span></template
        ></el-table-column
      >
      <template #empty
        ><el-empty :image-size="55" description="当前筛选和层级没有可拆解数据"
      /></template>
    </el-table>
    <el-table v-else :data="sourceRows" max-height="460"
      ><el-table-column prop="period" label="月份" width="100" fixed /><el-table-column
        prop="project"
        label="项目"
        min-width="190"
        show-overflow-tooltip /><el-table-column
        prop="channel"
        label="渠道大类"
        width="110" /><el-table-column
        prop="channelObject"
        label="供应商 / 平台"
        min-width="135"
        show-overflow-tooltip /><el-table-column
        prop="channelDetail"
        label="细分触点"
        min-width="160"
        show-overflow-tooltip /><el-table-column
        prop="customer"
        label="客群"
        width="100" /><el-table-column
        v-for="column in factColumns"
        :key="column.key"
        :label="column.label + '（' + column.unit + '）'"
        min-width="160"
        align="right"
        ><template #default="{ row }">{{
          formatKpiCell(row.values[column.key], column)
        }}</template></el-table-column
      ><template #empty><el-empty :image-size="55" description="本期暂无来源记录" /></template
    ></el-table>
    <div class="table-footer">
      <span
        >共 {{ fmt(rowCount) }} {{ tab === 'breakdown' ? '个对象' : '条记录' }} ·
        合计按当前层全部数据计算，导出包含全部页</span
      ><el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="rowCount"
        layout="sizes,prev,pager,next"
        background
        small
      />
    </div>
    <p class="muted" v-if="context.key === 'collection'">
      当前回款与签约按各自期间汇总，尚无合同与到账流水关联，不能据此认定合同应收、逾期或欠款。
    </p>
    <template #footer
      ><el-button @click="back">{{ path.length ? '返回上一级' : '返回看板' }}</el-button
      ><el-button @click="store.kpiDetailVisible = false">关闭</el-button
      ><el-button type="primary" @click="download">导出当前层 CSV</el-button></template
    >
  </el-drawer>
</template>
