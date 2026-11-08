<script setup lang="ts">
import { computed } from 'vue';
import type { MarketingPerformanceMetric } from '../../types';
import BaseChart from '../../charts/components/BaseChart.vue';
import { donutOption } from '../../charts/options';
import { bubblePalette } from '../../charts/themes/bubbles';
import { groupRows, fmt, summarize } from '../../utils/metrics';

const props = defineProps<{
  channel: string;
  rows: MarketingPerformanceMetric[];
  nationalRows?: MarketingPerformanceMetric[];
}>();
const nationalGroups = computed(
  () =>
    new Map(
      groupRows(
        (props.nationalRows || []).filter((r) => r.channel === props.channel),
        'channelObject',
      ).map((row) => [row.name, row]),
    ),
);
function nationalRate(name: string) {
  const row = nationalGroups.value.get(name);
  return row ? percent(row.contracts, row.visitPeople) : '—';
}
const groups = computed(() =>
  groupRows(
    props.rows.filter((r) => r.channel === props.channel),
    'channelObject',
  ),
);
const total = computed(() => summarize(groups.value.flatMap((r) => r.records)));
const color = (name: string) =>
  bubblePalette[
    Math.max(
      0,
      groups.value.findIndex((r) => r.name === name),
    ) % bubblePalette.length
  ];
const option = computed(() =>
  donutOption(groups.value, { showLegend: false, colorForName: color }),
);
const percent = (value: number, denominator: number) =>
  denominator ? `${fmt((value / denominator) * 100, 1)}%` : '—';
</script>

<template>
  <section class="secondary-channel-panel">
    <header class="panel-head">
      <div>
        <h3>二级渠道结构与明细</h3>
      </div>
    </header>
    <div class="secondary-channel-body">
      <BaseChart :option="option" :height="260" :empty="!groups.length" unit="组" />
      <el-table :data="groups" size="small" empty-text="当前渠道暂无数据">
        <el-table-column label="二级渠道" prop="name" min-width="115">
          <template #default="{ row }"
            ><span class="secondary-channel-name"
              ><i :style="{ background: color(row.name) }"></i>{{ row.name }}</span
            ></template
          >
        </el-table-column>
        <el-table-column label="线索数量" align="right" min-width="70"
          ><template #default="{ row }">{{ fmt(row.leads) }} 组</template></el-table-column
        >
        <el-table-column label="线索占比" align="right" min-width="65"
          ><template #default="{ row }">{{
            percent(row.leads, total.leads)
          }}</template></el-table-column
        >
        <el-table-column label="到访人数" align="right" min-width="70"
          ><template #default="{ row }">{{ fmt(row.visitPeople) }} 人</template></el-table-column
        >
        <el-table-column label="认购套数" align="right" min-width="70"
          ><template #default="{ row }"
            >{{ fmt(row.subscriptionUnits) }} 套</template
          ></el-table-column
        >
        <el-table-column label="签约套数" align="right" min-width="70"
          ><template #default="{ row }">{{ fmt(row.contracts) }} 套</template></el-table-column
        >
        <el-table-column label="单套获客成本(元/套)" align="right" min-width="130"
          ><template #default="{ row }">{{
            row.contracts ? fmt((row.fee * 10000) / row.contracts, 2) : '—'
          }}</template></el-table-column
        >
        <el-table-column label="到访至签约转化率" align="right" min-width="115"
          ><template #default="{ row }">{{
            percent(row.contracts, row.visitPeople)
          }}</template></el-table-column
        >
        <el-table-column v-if="nationalRows" label="全国转化率" align="right" min-width="100">
          <template #header
            ><el-tooltip
              content="同统计周期、同二级渠道，全国签约套数 ÷ 全国到访人数 × 100%"
              placement="top"
              ><span>全国转化率 ⓘ</span></el-tooltip
            ></template
          >
          <template #default="{ row }">{{ nationalRate(row.name) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </section>
</template>

<style scoped>
.secondary-channel-panel {
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.secondary-channel-body {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(0, 3fr);
  gap: 24px;
  align-items: center;
}
.secondary-channel-body :deep(.el-table .cell) {
  padding: 0 5px;
  white-space: nowrap;
  font-size: 11px;
}
.secondary-channel-name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.secondary-channel-name i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
@media (max-width: 1250px) {
  .secondary-channel-body {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
