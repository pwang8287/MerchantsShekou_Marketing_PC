<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import type { MarketingPerformanceMetric } from '../../types';
import BaseChart from '../../charts/components/BaseChart.vue';
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
const bottleneck = computed(
  () =>
    stages.value
      .slice(1)
      .filter((s) => s.rate !== null)
      .sort((a, b) => a.rate! - b.rate!)[0],
);
const option = computed<EChartsOption>(() => ({
  color: ['#4f8cff', '#67b6dc', '#52c6b5', '#91cb85', '#eab85f', '#f79e72'],
  tooltip: {
    trigger: 'item',
    formatter: (params) => {
      const p = params as { dataIndex: number };
      const s = stages.value[p.dataIndex];
      return `${s.name}<br/>数量：${fmt(s.value)} ${s.unit}<br/>上一步转化率：${percent(s.rate)}<br/>累计转化率：${percent(s.cumulative)}`;
    },
  },
  series: [
    {
      type: 'funnel',
      cursor: 'default',
      sort: 'none',
      left: '8%',
      width: '84%',
      top: 12,
      bottom: 12,
      minSize: '10%',
      maxSize: '100%',
      gap: 5,
      label: {
        show: true,
        position: 'inside',
        fontSize: 12,
        formatter: (p) => `${p.name}  ${fmt(Number(p.value))}`,
      },
      data: stages.value.map((s) => ({ name: s.name, value: s.value })),
    },
  ],
}));
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
      <BaseChart :option="option" :height="260" :empty="!rows.length" unit="组 / 人 / 套" />
      <div class="channel-stage-analysis">
        <p v-if="bottleneck" class="channel-stage-insight">
          重点关注：{{ stages[stages.indexOf(bottleneck) - 1].name }} → {{ bottleneck.name }}
          <strong>{{ percent(bottleneck.rate) }}</strong>
        </p>
        <el-table :data="stages" size="small">
          <el-table-column label="关键环节" min-width="150">
            <template #default="{ row }">
              {{ row.name }}
            </template>
          </el-table-column>
          <el-table-column label="数量" min-width="105" align="right">
            <template #default="{ row }">{{ fmt(row.value) }} {{ row.unit }}</template>
          </el-table-column>
          <el-table-column label="上一步转化率" min-width="110" align="right">
            <template #default="{ row }">{{ percent(row.rate) }}</template>
          </el-table-column>
          <el-table-column v-if="nationalRows" label="全国转化率" min-width="110" align="right">
            <template #header
              ><el-tooltip
                content="同统计周期、同渠道，全国当前环节数量 ÷ 全国上一环节数量 × 100%"
                placement="top"
                ><span>全国转化率 ⓘ</span></el-tooltip
              ></template
            >
            <template #default="{ row }">{{ percent(row.nationalRate) }}</template>
          </el-table-column>
          <el-table-column label="环节减少量" min-width="100" align="right">
            <template #default="{ row }">{{ row.lost === null ? '—' : fmt(row.lost) }}</template>
          </el-table-column>
          <el-table-column label="累计转化率" min-width="100" align="right">
            <template #default="{ row }">{{ percent(row.cumulative) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.channel-detail-funnel {
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
  grid-template-columns: minmax(250px, 1fr) minmax(540px, 2fr);
  gap: 24px;
  align-items: center;
}
.channel-stage-analysis {
  min-width: 0;
}
.channel-stage-insight {
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
