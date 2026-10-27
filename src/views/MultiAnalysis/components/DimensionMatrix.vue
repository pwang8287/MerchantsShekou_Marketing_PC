<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { dimensions, metricDefs, fmt, summarize } from '../../../utils/metrics';
import type { Dimension, MetricKey, MarketingMatrixCell } from '../../../types';
const props = defineProps<{ metric: MetricKey }>();
const store = useDashboardStore();
const rowDim = ref<Dimension>('project');
const columnDim = ref<Dimension>('channel');
const order = ref('desc');
const columns = computed(() => [...new Set(store.filtered.map((r) => r[columnDim.value]))].sort());
const rows = computed(() =>
  [...new Set(store.filtered.map((r) => r[rowDim.value]))]
    .map((name) => ({ name, records: store.filtered.filter((r) => r[rowDim.value] === name) }))
    .sort(
      (a, b) =>
        (summarize(b.records)[props.metric] - summarize(a.records)[props.metric]) *
        (order.value === 'desc' ? 1 : -1),
    ),
);
const cells = computed<MarketingMatrixCell[]>(() =>
  rows.value.flatMap((row) =>
    columns.value.map((column) => {
      const records = row.records.filter((r) => r[columnDim.value] === column);
      return { row: row.name, column, value: summarize(records)[props.metric], records };
    }),
  ),
);
const max = computed(() => Math.max(...cells.value.map((c) => c.value), 1));
const getCell = (row: string, column: string) =>
  cells.value.find((c) => c.row === row && c.column === column)!;
const cellStyle = (row: string, column: string) => {
  const n = getCell(row, column).value / max.value;
  return {
    backgroundColor: `rgba(40,115,237,${0.04 + n * 0.63})`,
    color: n > 0.65 ? '#fff' : '#14243D',
  };
};
</script>
<template>
  <section class="panel matrix-panel">
    <header class="panel-head">
      <div>
        <h3>多维指标矩阵</h3>
        <p>
          {{ metricDefs[metric].label }} · 单位：{{ metricDefs[metric].unit }} ·
          颜色深浅表示指标大小{{ metricDefs[metric].lowerBetter ? '，成本越低越优' : '' }}
        </p>
      </div>
      <div class="matrix-controls">
        <el-select v-model="rowDim" size="small" aria-label="行维度"
          ><el-option
            v-for="(label, key) in dimensions"
            :key="key"
            :label="label"
            :value="key"
            :disabled="key === columnDim" /></el-select
        ><span>×</span
        ><el-select v-model="columnDim" size="small" aria-label="列维度"
          ><el-option
            v-for="(label, key) in dimensions"
            :key="key"
            :label="label"
            :value="key"
            :disabled="key === rowDim" /></el-select
        ><el-select v-model="order" size="small" aria-label="矩阵排序"
          ><el-option label="指标降序" value="desc" /><el-option label="指标升序" value="asc"
        /></el-select>
      </div>
    </header>
    <div class="matrix-scroll" v-if="rows.length">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>{{ dimensions[rowDim] }} / {{ dimensions[columnDim] }}</th>
            <th v-for="column in columns" :key="column">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.name">
            <th>{{ row.name }}</th>
            <td v-for="column in columns" :key="column">
              <button
                :style="cellStyle(row.name, column)"
                :aria-label="`${row.name} ${column} ${metricDefs[metric].label}`"
                @click="store.drill(row.name + ' / ' + column, getCell(row.name, column).records)"
              >
                {{
                  getCell(row.name, column).records.length
                    ? fmt(getCell(row.name, column).value, metricDefs[metric].unit === '%' ? 1 : 0)
                    : '—'
                }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <el-empty v-else description="当前条件暂无数据" :image-size="60" />
    <footer class="matrix-legend">
      <span>低</span><i></i><span>高</span><span>点击单元格查看明细</span>
    </footer>
  </section>
</template>
