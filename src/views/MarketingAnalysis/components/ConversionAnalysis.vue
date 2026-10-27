<script setup lang="ts">
import { computed } from 'vue';
import ChartPanel from '../../../components/common/ChartPanel.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { funnelOption, donutOption } from '../../../charts/options';
import { groupRows, fmt, divide } from '../../../utils/metrics';
import type { AggregateRow, ConversionFunnelStage } from '../../../types';
const store = useDashboardStore();
function drillChannel(row: AggregateRow) {
  store.drill(row.name + ' · 渠道客户', row.records);
}
const channels = computed(() => groupRows(store.filtered, 'channel'));
const funnel = computed(() => funnelOption(store.filtered));
const structure = computed(() => donutOption(channels.value));
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
      <span class="panel-hint">金额：万元 · 客户：组 / 套</span>
    </header>
    <div class="channel-body">
      <div class="channel-structure">
        <ChartPanel
          class="nested-chart channel-donut"
          title="渠道客户结构"
          :option="structure"
          :height="200"
          unit="组"
          @select="
            (name) =>
              store.drill(
                name + ' · 渠道明细',
                store.filtered.filter((r) => r.channel === name),
              )
          "
        />
        <div class="channel-table">
          <div class="subpanel-heading">
            <h4>渠道贡献明细</h4>
            <span>点击渠道查看客户来源</span>
          </div>
          <el-table :data="channels" size="small" @row-click="drillChannel"
            ><el-table-column
              prop="name"
              label="渠道"
              min-width="92"
              show-overflow-tooltip
            /><el-table-column prop="leads" label="线索" min-width="65" align="right"
              ><template #default="{ row }">{{ fmt(row.leads) }}</template></el-table-column
            ><el-table-column prop="amount" label="签约金额" min-width="90" align="right"
              ><template #default="{ row }">{{ fmt(row.amount) }}</template></el-table-column
            ><el-table-column prop="conversion" label="转化率" min-width="80" align="right"
              ><template #default="{ row }"
                ><span class="status-tag positive">{{ fmt(row.conversion, 1) }}%</span></template
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
          @select="(name) => store.drill(name + '阶段 · 客户明细')"
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
