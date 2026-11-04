<script setup lang="ts">
import { computed } from 'vue';
import ChartPanel from '../../../components/common/ChartPanel.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { bubbleColor } from '../../../charts/themes/bubbles';
import { funnelOption, donutOption } from '../../../charts/options';
import { groupRows, fmt, divide, filterRows, summarize } from '../../../utils/metrics';
import type { AggregateRow, ConversionFunnelStage } from '../../../types';
const store = useDashboardStore();
const headquartersRate = computed(() => {
  const summary = summarize(
    filterRows(store.rows, {
      ...store.filter,
      organization: '',
      organizationNames: [],
      region: '',
      city: '',
      project: '',
    }),
  );
  return summary.visitPeople ? (summary.contracts / summary.visitPeople) * 100 : null;
});
function conversionClass(rate: number | null) {
  if (rate === null || headquartersRate.value === null) return '';
  const difference = rate - headquartersRate.value;
  return difference > 1e-9 ? 'channel-rate-above' : difference < -1e-9 ? 'channel-rate-below' : '';
}
function drillChannel(row: AggregateRow) {
  store.drill(row.name + ' · 渠道客户', row.records, row.name);
}
const channels = computed(() =>
  groupRows(store.filtered, 'channel').map((row) => ({
    ...row,
    visitToContractRate: row.visitPeople ? (row.contracts / row.visitPeople) * 100 : null,
  })),
);
const funnel = computed(() => funnelOption(store.filtered));
const structure = computed(() =>
  donutOption(channels.value, { showLegend: false, colorForName: bubbleColor }),
);
const stages = computed<ConversionFunnelStage[]>(() => {
  const s = store.summary;
  return [
    { name: '线索 → 到访', value: s.visits, rate: divide(s.visits, s.leads) * 100 },
    { name: '到访 → 认购', value: s.subscriptions, rate: divide(s.subscriptions, s.visits) * 100 },
    { name: '认购 → 签约', value: s.contracts, rate: divide(s.contracts, s.subscriptions) * 100 },
  ];
});
</script>
<template>
  <section class="panel channel-panel">
    <header class="panel-head">
      <h3>营销渠道结构与客户转化</h3>
      <span class="panel-hint">金额：万元 · 线索：组 · 到访：人 · 签约：套</span>
    </header>
    <div class="channel-body">
      <div class="channel-structure">
        <ChartPanel
          class="nested-chart channel-donut"
          title=""
          :option="structure"
          :height="200"
          unit="组"
          @select="
            (name) =>
              store.drill(
                name + ' · 渠道明细',
                store.filtered.filter((r) => r.channel === name),
                name,
              )
          "
        />
        <div class="channel-table">
          <div class="subpanel-heading">
            <h4>渠道贡献明细</h4>
          </div>
          <el-table :data="channels" size="small" @row-click="drillChannel"
            ><el-table-column prop="name" label="渠道" min-width="92" show-overflow-tooltip
              ><template #default="{ row }"
                ><span class="channel-name-cell"
                  ><i
                    class="channel-color-swatch"
                    :style="{ backgroundColor: bubbleColor(row.name) }"
                    aria-hidden="true"
                  ></i
                  ><span class="channel-name-text">{{ row.name }}</span></span
                ></template
              ></el-table-column
            ><el-table-column prop="leads" label="线索" min-width="60" align="right"
              ><template #default="{ row }">{{ fmt(row.leads) }}</template></el-table-column
            ><el-table-column prop="visitPeople" label="到访人数" min-width="72" align="right"
              ><template #default="{ row }"
                >{{ fmt(row.visitPeople) }} 人</template
              ></el-table-column
            ><el-table-column prop="amount" label="签约金额(万元)" min-width="92" align="right"
              ><template #default="{ row }">{{ fmt(row.amount, 2) }}</template></el-table-column
            ><el-table-column
              prop="visitToContractRate"
              label="到访至签约转化率"
              min-width="126"
              align="right"
              ><template #header
                ><el-tooltip
                  content="签约套数 ÷ 到访人数 × 100%；为期间业务量比值，不代表同批客户的追踪转化率。"
                  placement="top"
                  ><span>到访至签约转化率 ⓘ</span></el-tooltip
                ></template
              ><template #default="{ row }"
                ><span
                  v-if="row.visitToContractRate !== null"
                  class="channel-rate"
                  :class="conversionClass(row.visitToContractRate)"
                  >{{ fmt(row.visitToContractRate, 1) }}%</span
                ><span v-else>—</span></template
              ></el-table-column
            ></el-table
          >
        </div>
      </div>
      <div class="channel-funnel">
        <ChartPanel
          class="nested-chart"
          title="客户转化漏斗"
          subtitle="从线索到签约，定位关键转化环节"
          :option="funnel"
          :height="190"
          unit="组 / 套"
        />
        <div class="funnel-rates">
          <div v-for="stage in stages" :key="stage.name">
            <small>{{ stage.name }}</small
            ><strong>{{ fmt(stage.rate, 1) }}%</strong>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.channel-body {
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
}
.channel-table :deep(.el-table) {
  font-size: 11px;
  margin-top: 0;
  margin-bottom: 0;
}
.channel-table > .subpanel-heading {
  margin-bottom: 8px;
}
.channel-donut :deep(.panel-head) {
  display: none;
}
.channel-table :deep(.el-table th.el-table__cell) {
  height: 28px;
  padding: 4px 0;
  font-size: 10px;
}
.channel-table :deep(.el-table td.el-table__cell) {
  padding: 4px 0;
  font-size: 11px;
}
.channel-table :deep(.el-table .cell) {
  padding: 0 5px;
  line-height: 18px;
  white-space: nowrap;
}
.channel-name-cell {
  gap: 5px;
}
.channel-name-text {
  color: #4285f4;
  cursor: pointer;
}
.channel-rate {
  display: inline-block;
  border-radius: 5px;
  font-weight: 600;
  padding: 1px 5px;
  font-size: 10px;
  line-height: 18px;
}
.channel-rate-above {
  color: #527dcc;
  background: #eff5ff;
}
.channel-rate-below {
  color: #8792a2;
  background: #f5f6f8;
}
@media (max-width: 1180px) {
  .channel-body {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
