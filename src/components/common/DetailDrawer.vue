<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore } from '../../stores/dashboard';
import { groupRows, fmt, summarize } from '../../utils/metrics';
import MetricTable from '../tables/MetricTable.vue';
import ChannelFunnel from '../dashboard/ChannelFunnel.vue';
import SecondaryChannelAnalysis from '../dashboard/SecondaryChannelAnalysis.vue';
import { nationalChannelRows } from '../../utils/channelBenchmark';
import { formatStatisticsPeriod } from '../../utils/statisticsPeriod';
import CustomerStructureAnalysis from '../../views/MarketingAnalysis/components/CustomerStructureAnalysis.vue';
import AdvisorChannelAnalysis from '../dashboard/AdvisorChannelAnalysis.vue';
import ChannelOrganizationRanking from '../dashboard/ChannelOrganizationRanking.vue';
import { simulatedDealCycle } from '../../utils/dealCycle';
const store = useDashboardStore();
const advisorName = computed(() => {
  const first = store.detailRows[0]?.advisor;
  return first && store.detailRows.every((row) => row.advisor === first) ? first : '';
});
const drawerTitle = computed(() => {
  if (advisorName.value && !store.detailChannel) return `${advisorName.value}转化分析`;
  if (!store.detailChannel) return store.detailTitle;
  if (store.projectScope) {
    return `${store.projectScope} · ${store.detailChannel}渠道转化分析`;
  }
  return `${store.filter.organizationLabel || store.filter.organization || '招商蛇口'} · ${store.detailChannel}渠道转化分析`;
});
const statisticsTime = computed(() =>
  store.detailChannel || advisorName.value
    ? formatStatisticsPeriod(store.filter)
    : store.filter.period.join(' 至 '),
);
const summary = computed(() => summarize(store.detailRows));
const averageDealCycle = computed(() => simulatedDealCycle(store.detailRows));
const channels = computed(() => groupRows(store.detailRows, 'channel'));
const nationalRows = computed(() =>
  (store.cityScope || store.projectScope) && store.detailChannel
    ? nationalChannelRows(store.rows, store.filter, store.detailChannel)
    : undefined,
);
</script>
<template>
  <el-drawer v-model="store.drawer" :title="drawerTitle" size="78%"
    ><div class="detail-context">
      <el-tag v-if="!store.detailChannel && !advisorName">已保留全局筛选</el-tag>
      <span
        >{{ statisticsTime
        }}<template v-if="!store.detailChannel && !advisorName">
          · {{ store.filter.basis }}</template
        ></span
      >
    </div>
    <div class="detail-kpis">
      <div>
        <span>签约金额（万元）</span><strong>{{ fmt(summary.amount, 2) }}</strong>
      </div>
      <div>
        <span>签约套数</span><strong>{{ fmt(summary.contracts) }}</strong>
      </div>
      <div>
        <template v-if="store.detailChannel || advisorName">
          <span>到访至签约转化率</span>
          <strong>{{
            summary.visitPeople
              ? fmt((summary.contracts / summary.visitPeople) * 100, 1) + '%'
              : '—'
          }}</strong>
        </template>
        <template v-else
          ><span>签约转化率</span><strong>{{ fmt(summary.conversion, 1) }}%</strong></template
        >
      </div>
      <div>
        <template v-if="advisorName">
          <span>平均成交周期（天）</span>
          <strong>{{ averageDealCycle === null ? '—' : fmt(averageDealCycle, 1) }}</strong>
        </template>
        <template v-else>
          <span>获客成本（元/套）</span><strong>{{ fmt(summary.acquisition, 2) }}</strong>
        </template>
      </div>
    </div>
    <CustomerStructureAnalysis
      v-if="advisorName"
      :records="store.detailRows"
      :title="advisorName + ' · 户型转化分析'"
    />
    <AdvisorChannelAnalysis v-if="advisorName" :rows="store.detailRows" />
    <ChannelFunnel
      v-if="store.detailChannel"
      :channel="store.detailChannel"
      :rows="store.detailRows"
      :national-rows="nationalRows"
    />
    <MetricTable
      v-if="!store.detailChannel && !advisorName"
      :rows="channels"
      title="渠道贡献"
      name-label="渠道"
      :compact="true"
      :metrics="['amount', 'leads', 'visits', 'contracts', 'conversion']"
    />
    <SecondaryChannelAnalysis
      v-if="store.detailChannel"
      :channel="store.detailChannel"
      :rows="store.detailRows"
      :national-rows="nationalRows"
    />
    <ChannelOrganizationRanking
      v-if="store.detailChannel && !store.projectScope && !store.filter.project"
      :rows="store.detailRows"
      :channel="store.detailChannel"
      :metric="store.detailChannelMetric"
    />
    <el-alert
      v-if="!store.detailChannel && !advisorName"
      class="detail-note"
      type="info"
      :closable="false"
      title="演示环境提供客群汇总数据。客户明细按月份、项目、渠道及客户类型展示，不包含真实客户个人信息。"
    /><el-table
      v-if="!advisorName && !store.detailChannel"
      :data="store.detailRows.slice(0, 100)"
      max-height="350"
      size="small"
      ><el-table-column prop="period" label="月份" width="100" /><el-table-column
        prop="project"
        label="项目"
        min-width="190" /><el-table-column
        prop="channel"
        label="渠道大类"
        width="110" /><el-table-column
        prop="channelObject"
        label="供应商 / 平台"
        min-width="140"
        show-overflow-tooltip /><el-table-column
        prop="channelDetail"
        label="细分触点"
        min-width="150"
        show-overflow-tooltip /><el-table-column
        prop="customer"
        label="客户类型"
        width="110" /><el-table-column
        prop="leads"
        label="线索（组）"
        align="right" /><el-table-column prop="contracts" label="签约（套）" align="right"
    /></el-table>
    <p v-if="!advisorName && !store.detailChannel" class="muted">
      预览前 100 条，共 {{ store.detailRows.length }} 条。
    </p>
  </el-drawer>
</template>
