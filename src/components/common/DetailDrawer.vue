<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore } from '../../stores/dashboard';
import { groupRows, fmt, summarize } from '../../utils/metrics';
import MetricTable from '../tables/MetricTable.vue';
import { exportCsv } from '../../utils/export';
const store = useDashboardStore();
const summary = computed(() => summarize(store.detailRows));
const channels = computed(() => groupRows(store.detailRows, 'channel'));
function exportDetails() {
  exportCsv(
    store.detailTitle,
    [
      '月份',
      '项目',
      '渠道大类',
      '供应商 / 平台',
      '细分触点',
      '客户类型',
      '线索（组）',
      '到访（组）',
      '认购（组）',
      '签约（套）',
      '签约金额（万元）',
      '营销费用（万元）',
    ],
    store.detailRows.map((r) => [
      r.period,
      r.project,
      r.channel,
      r.channelObject,
      r.channelDetail,
      r.customer,
      r.leads,
      r.visits,
      r.subscriptions,
      r.contracts,
      r.amount,
      r.fee,
    ]),
  );
}
</script>
<template>
  <el-drawer v-model="store.drawer" :title="store.detailTitle" size="78%"
    ><div class="detail-context">
      <el-tag>已保留全局筛选</el-tag
      ><span>{{ store.filter.period.join(' 至 ') }} · {{ store.filter.basis }}</span>
    </div>
    <div class="detail-kpis">
      <div>
        <span>签约金额（万元）</span><strong>{{ fmt(summary.amount) }}</strong>
      </div>
      <div>
        <span>签约套数</span><strong>{{ fmt(summary.contracts) }}</strong>
      </div>
      <div>
        <span>签约转化率</span><strong>{{ fmt(summary.conversion, 1) }}%</strong>
      </div>
      <div>
        <span>获客成本（元/套）</span><strong>{{ fmt(summary.acquisition) }}</strong>
      </div>
    </div>
    <MetricTable
      :rows="channels"
      title="渠道贡献"
      name-label="渠道"
      :compact="true"
      :metrics="['amount', 'leads', 'visits', 'contracts', 'conversion']"
    /><el-alert
      class="detail-note"
      type="info"
      :closable="false"
      title="演示环境提供客群汇总数据。客户明细按月份、项目、渠道及客户类型展示，不包含真实客户个人信息。"
    /><el-table :data="store.detailRows.slice(0, 100)" max-height="350" size="small"
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
    <p class="muted">预览前 100 条，共 {{ store.detailRows.length }} 条。导出包含全部记录。</p>
    <template #footer
      ><el-button @click="store.drawer = false">返回上一级</el-button
      ><el-button type="primary" @click="exportDetails">导出明细</el-button></template
    ></el-drawer
  >
</template>
