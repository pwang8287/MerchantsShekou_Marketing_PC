<script setup lang="ts">
import { computed } from 'vue';
import type { MarketingPerformanceMetric } from '../../types';
import ConversionFunnelVisual from './ConversionFunnelVisual.vue';
import { useDashboardStore } from '../../stores/dashboard';
import { summarize } from '../../utils/metrics';
import { comparisonChannelRows } from '../../utils/channelBenchmark';
import { comparisonChange, comparisonHtml } from '../../utils/comparison';
import { buildChannelFunnel } from '../../utils/channelFunnel';
import { fmt } from '../../utils/metrics';

const props = defineProps<{
  channel: string;
  rows: MarketingPerformanceMetric[];
  nationalRows?: MarketingPerformanceMetric[];
}>();
const stages = computed(() => {
  const national = buildChannelFunnel(props.nationalRows || [], props.channel);
  return buildChannelFunnel(props.rows, props.channel).map((stage, index) => ({
    ...stage,
    nationalRate: national[index].rate,
  }));
});
const percent = (value: number | null) => (value === null ? '—' : `${fmt(value, 1)}%`);
const store = useDashboardStore();
const totals = computed(() => summarize(props.rows));
const visualStages = computed(() =>
  stages.value.map((stage, index) => ({
    ...stage,
    key: ['leads', 'visitPeople', 'subscriptionUnits', 'contracts'][index],
    name: ['线索数量', '到访人数', '认购套数', '签约套数'][index],
    color: ['#a3c4fa', '#7aa7f5', '#508bf0', '#2873ed'][index],
  })),
);
const comparisons = computed(() => ({
  yoy: buildChannelFunnel(
    comparisonChannelRows(store.rows, store.filter, props.channel, 'yoy') || [],
    props.channel,
  ),
  mom: buildChannelFunnel(
    comparisonChannelRows(store.rows, store.filter, props.channel, 'mom') || [],
    props.channel,
  ),
}));
const comparisonColumns = computed(() =>
  store.filter.periodType === 'month'
    ? [
        { key: 'yoy' as const, label: '同比' },
        { key: 'mom' as const, label: '环比' },
      ]
    : store.filter.periodType === 'year'
      ? [{ key: 'yoy' as const, label: '同比' }]
      : [],
);
function change(index: number, key: 'yoy' | 'mom') {
  return comparisonHtml(
    comparisonChange(stages.value[index].value, comparisons.value?.[key][index].value),
  );
}
</script>

<template>
  <section class="channel-detail-funnel">
    <header class="panel-head">
      <div>
        <h3>{{ channel }} · 关键环节漏斗分析</h3>
        <p>线索：组 / 到访：人 / 认购、签约：套</p>
      </div>
    </header>
    <div class="channel-detail-funnel-body">
      <ConversionFunnelVisual
        :stages="visualStages"
        :totals="totals"
        :selected-index="null"
        compact
        hide-focus
      />
      <div class="channel-stage-analysis">
        <p class="channel-stage-insight">
          重点关注：到访→签约
          <strong>{{
            totals.visitPeople ? fmt((totals.contracts / totals.visitPeople) * 100, 1) + '%' : '—'
          }}</strong>
        </p>
        <el-table :data="stages" size="small">
          <el-table-column label="关键环节" min-width="56">
            <template #default="{ row }">
              {{ row.name }}
            </template>
          </el-table-column>
          <el-table-column label="数量" min-width="65" align="right">
            <template #default="{ row }">{{ fmt(row.value) }} {{ row.unit }}</template>
          </el-table-column>
          <template v-for="column in comparisonColumns" :key="column.key">
            <el-table-column
              :label="column.key === 'yoy' ? '去年同期值' : '上个月值'"
              min-width="68"
              align="right"
            >
              <template #default="{ $index, row }"
                >{{ fmt(comparisons[column.key][$index].value) }} {{ row.unit }}</template
              >
            </el-table-column>
            <el-table-column :label="column.label" min-width="68" align="right">
              <template #default="{ $index }"
                ><span v-html="change($index, column.key)"
              /></template>
            </el-table-column>
          </template>
          <el-table-column label="上一步转化率" min-width="84" align="right">
            <template #default="{ row }">{{ percent(row.rate) }}</template>
          </el-table-column>
          <el-table-column v-if="nationalRows" label="全国转化率" min-width="84" align="right">
            <template #header
              ><el-tooltip
                content="同统计周期、同渠道，全国当前环节数量 ÷ 全国上一环节数量 × 100%"
                placement="top"
                ><span>全国转化率 ⓘ</span></el-tooltip
              ></template
            >
            <template #default="{ row }">{{ percent(row.nationalRate) }}</template>
          </el-table-column>
          <el-table-column label="累计转化率" min-width="76" align="right">
            <template #default="{ row }">{{ percent(row.cumulative) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.channel-detail-funnel {
  container-type: inline-size;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.panel-head p {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}
.channel-detail-funnel-body {
  display: grid;
  grid-template-columns: minmax(250px, 1fr) minmax(0, 2fr);
  gap: 24px;
  align-items: center;
}
.channel-stage-analysis {
  min-width: 0;
}
.channel-stage-analysis :deep(.el-table .cell) {
  padding: 0 4px;
  font-size: 10px;
  white-space: nowrap;
}
.channel-stage-analysis :deep(.comparison-badge) {
  padding: 2px 4px;
  font-size: 10px;
  white-space: nowrap;
}
@container (max-width: 1000px) {
  .channel-detail-funnel-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .channel-detail-funnel-body > :deep(.conversion-funnel) {
    max-width: 450px;
    margin: 0 auto;
  }
}
.channel-stage-insight {
  margin: 0 0 10px;
  padding: 10px 12px;
  background: #f2f7ff;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
}
.channel-stage-insight strong {
  color: #2873ed;
  margin-left: 8px;
}
@media (max-width: 1250px) {
  .channel-detail-funnel-body {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
