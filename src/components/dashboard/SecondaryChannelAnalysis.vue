<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { MarketingPerformanceMetric } from '../../types';
import BaseChart from '../../charts/components/BaseChart.vue';
import { donutOption } from '../../charts/options';
import { bubblePalette } from '../../charts/themes/bubbles';
import { groupRows, fmt, summarize } from '../../utils/metrics';
import { matchesChannel } from '../../utils/channels';
import { useDashboardStore } from '../../stores/dashboard';
const store = useDashboardStore();

const props = defineProps<{
  channel: string;
  rows: MarketingPerformanceMetric[];
  nationalRows?: MarketingPerformanceMetric[];
}>();
const grouping = computed(() => (props.channel === '线下渠道' ? 'channel' : 'channelObject'));
const nationalGroups = computed(
  () =>
    new Map(
      groupRows(
        (props.nationalRows || []).filter((r) => matchesChannel(r.channel, props.channel)),
        grouping.value,
      ).map((row) => [row.name, row]),
    ),
);
function nationalRate(name: string) {
  const row = nationalGroups.value.get(name);
  return row ? percent(row.contracts, row.visitPeople) : '—';
}
const groups = computed(() =>
  groupRows(
    props.rows.filter((r) => matchesChannel(r.channel, props.channel)),
    grouping.value,
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
const activeChannel = ref('');
watch(
  () => props.rows,
  () => {
    activeChannel.value = '';
  },
);
function hoverChannel(row: { name: string }) {
  activeChannel.value = row.name;
}
function rowClassName({ row }: { row: { name: string } }) {
  return row.name === activeChannel.value ? 'channel-hovered' : '';
}
const option = computed(() => {
  const result = donutOption(groups.value, { showLegend: false, colorForName: color });
  result.tooltip = {
    trigger: 'item',
    confine: true,
    backgroundColor: '#fff',
    borderColor: '#dce5f2',
    textStyle: { color: '#435775', fontSize: 12 },
    formatter: (params: unknown) => {
      const item = params as { name: string; value: number; percent: number; marker: string };
      return `${item.marker}${item.name}<br/>线索数量：${fmt(Number(item.value))} 组<br/>渠道占比：${fmt(item.percent, 2)}%`;
    },
  };
  if (Array.isArray(result.series)) {
    result.series = result.series.map((series) =>
      series.type === 'pie'
        ? {
            ...series,
            emphasis: { focus: 'self', scale: true, scaleSize: 5, itemStyle: { opacity: 1 } },
            blur: { itemStyle: { opacity: 0.25 } },
          }
        : series,
    );
  }
  return result;
});
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
      <BaseChart
        :option="option"
        :height="260"
        :empty="!groups.length"
        unit="组"
        :highlight-name="activeChannel"
        highlight-tooltip
        @hover="activeChannel = $event"
        @leave="activeChannel = ''"
      />
      <el-table
        :data="groups"
        size="small"
        empty-text="当前渠道暂无数据"
        :row-class-name="rowClassName"
        @cell-mouse-enter="hoverChannel"
        @mouseleave="activeChannel = ''"
      >
        <el-table-column label="二级渠道" prop="name" min-width="115">
          <template #default="{ row }"
            ><button
              v-if="channel === '线下渠道'"
              class="secondary-channel-name secondary-channel-link"
              @click="store.drill(row.name, row.records, row.name, 'visitPeople')"
            >
              <i :style="{ background: color(row.name) }"></i>{{ row.name }}</button
            ><span v-else class="secondary-channel-name"
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
.secondary-channel-body :deep(.channel-hovered > td.el-table__cell) {
  background: #eff6ff;
  box-shadow:
    inset 0 1px #b7d6ff,
    inset 0 -1px #b7d6ff;
}
.secondary-channel-body :deep(.channel-hovered > td:first-child) {
  box-shadow:
    inset 1px 0 #b7d6ff,
    inset 0 1px #b7d6ff,
    inset 0 -1px #b7d6ff;
  border-radius: 4px 0 0 4px;
}
.secondary-channel-body :deep(.channel-hovered > td:last-child) {
  box-shadow:
    inset -1px 0 #b7d6ff,
    inset 0 1px #b7d6ff,
    inset 0 -1px #b7d6ff;
  border-radius: 0 4px 4px 0;
}

.secondary-channel-name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.secondary-channel-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #4285f4;
  font: inherit;
  cursor: pointer;
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
