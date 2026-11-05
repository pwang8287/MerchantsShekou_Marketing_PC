<script setup lang="ts">
import { computed, ref } from 'vue';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../../charts/components/BaseChart.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { bubbleColor } from '../../../charts/themes/bubbles';
import { donutOption } from '../../../charts/options';
import { groupRows, fmt, divide, filterRows, summarize } from '../../../utils/metrics';
import type { AggregateRow } from '../../../types';
const store = useDashboardStore();
const stageDefinitions = [
  { key: 'leads', name: '线索数量', unit: '组', color: '#2873ed' },
  { key: 'visitPeople', name: '到访人数', unit: '人', color: '#508bf0' },
  { key: 'subscriptionUnits', name: '认购套数', unit: '套', color: '#7aa7f5' },
  { key: 'contracts', name: '签约套数', unit: '套', color: '#a3c4fa' },
] as const;
const selectedIndex = ref(1);
const selected = computed(() => stageDefinitions[selectedIndex.value]);
const totals = computed(() => summarize(store.filtered));
const stages = computed(() =>
  stageDefinitions.map((stage, index) => ({
    ...stage,
    value: totals.value[stage.key],
    rate: index
      ? divide(totals.value[stage.key], totals.value[stageDefinitions[index - 1].key]) * 100
      : null,
  })),
);
const total = computed(() => totals.value[selected.value.key]);
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
  return difference > 1e-9 ? 'rate-above' : difference < -1e-9 ? 'rate-below' : '';
}
const channels = computed(() =>
  groupRows(store.filtered, 'channel').map((row) => ({
    ...row,
    stageValue: row[selected.value.key],
    share: total.value ? (row[selected.value.key] / total.value) * 100 : null,
    stageCost: row[selected.value.key] ? (row.fee * 10000) / row[selected.value.key] : null,
    visitToContractRate: row.visitPeople ? (row.contracts / row.visitPeople) * 100 : null,
  })),
);
function drillChannel(row: AggregateRow) {
  store.drill(row.name + ' · 渠道客户', row.records, row.name);
}
const structure = computed<EChartsOption>(() => {
  const option = donutOption(
    channels.value.map((row) => ({ ...row, leads: row.stageValue })),
    {
      showLegend: false,
      colorForName: bubbleColor,
    },
  );
  option.graphic = [
    {
      type: 'text',
      left: 'center',
      top: '40%',
      style: { text: selected.value.name, fontSize: 12, fill: '#71809a' },
    },
    {
      type: 'text',
      left: 'center',
      top: '50%',
      style: { text: fmt(total.value), fontSize: 24, fontWeight: 600, fill: selected.value.color },
    },
  ];
  // 构成数据使用当前环节数量，避免沿用线索数量或线索的同环比口径。
  option.tooltip = {
    trigger: 'item',
    confine: true,
    backgroundColor: '#fff',
    borderColor: '#dce5f2',
    textStyle: { color: '#435775', fontSize: 12 },
    formatter: (params: unknown) => {
      const item = params as { name: string; value: number; percent: number; marker: string };
      return `${item.marker}${item.name}<br/>${selected.value.name}：${fmt(Number(item.value))} ${selected.value.unit}<br/>渠道占比：${fmt(item.percent, 2)}%`;
    },
  };
  return option;
});
</script>
<template>
  <section class="panel conversion-composition">
    <header class="panel-head"><h3>客户转化与渠道构成分析</h3></header>
    <div class="conversion-layout">
      <div class="conversion-funnel">
        <h4>客户转化漏斗</h4>
        <div class="funnel-stage-list">
          <div v-for="(stage, index) in stages" :key="stage.key" class="funnel-stage-row">
            <button
              class="funnel-stage"
              :class="{ selected: selectedIndex === index }"
              :style="{ '--stage-color': stage.color, width: `${100 - index * 15}%` }"
              :aria-pressed="selectedIndex === index"
              @click="selectedIndex = index"
            >
              <span>{{ stage.name }}</span>
              <strong
                >{{ fmt(stage.value) }} <small>{{ stage.unit }}</small></strong
              >
              <span class="selected-stage-mark">{{
                selectedIndex === index ? '✓ 已选中' : ''
              }}</span>
            </button>
            <div v-if="index" class="stage-conversion">
              <span
                >{{ stageDefinitions[index - 1].name.replace(/数量|人数|套数/g, '') }}至{{
                  stage.name.replace(/数量|人数|套数/g, '')
                }}转化率</span
              >
              <strong>{{ fmt(stage.rate || 0, 1) }}%</strong>
            </div>
          </div>
        </div>
      </div>
      <div class="composition-panel" :style="{ '--stage-color': selected.color }">
        <header class="composition-heading">
          <h4>{{ selected.name }}渠道构成</h4>
        </header>
        <div class="composition-body">
          <BaseChart :option="structure" :height="280" :empty="!total" :loading="store.loading" />
          <el-table :data="channels" size="small" class="composition-table">
            <el-table-column prop="name" label="渠道" min-width="95">
              <template #default="{ row }"
                ><button class="channel-drill" @click="drillChannel(row)">
                  <i :style="{ background: bubbleColor(row.name) }" />{{ row.name }}
                </button></template
              >
            </el-table-column>
            <el-table-column :label="selected.name" prop="stageValue" min-width="84" align="right">
              <template #default="{ row }">{{ fmt(row.stageValue) }} {{ selected.unit }}</template>
            </el-table-column>
            <el-table-column label="渠道占比" prop="share" min-width="76" align="right">
              <template #default="{ row }">{{
                row.share === null ? '—' : fmt(row.share, 2) + '%'
              }}</template>
            </el-table-column>
            <el-table-column label="平均获客成本" min-width="98" align="right">
              <template #header
                ><el-tooltip :content="`营销费用 ÷ ${selected.name}；单位：元/${selected.unit}`"
                  ><span>平均获客成本 ⓘ</span></el-tooltip
                ></template
              >
              <template #default="{ row }">{{
                row.stageCost === null ? '—' : fmt(row.stageCost, 2)
              }}</template>
            </el-table-column>
            <el-table-column label="到访至签约转化率" min-width="125" align="right">
              <template #default="{ row }"
                ><span class="conversion-rate" :class="conversionClass(row.visitToContractRate)">{{
                  row.visitToContractRate === null ? '—' : fmt(row.visitToContractRate, 1) + '%'
                }}</span></template
              >
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.conversion-composition {
  padding: 16px;
  margin-bottom: 16px;
}
.conversion-composition > .panel-head {
  margin-bottom: 18px;
}
.conversion-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.85fr) minmax(0, 1.6fr);
  gap: 24px;
  align-items: stretch;
}
h4 {
  margin: 0;
  font-size: 13px;
  color: #14243d;
}
.conversion-funnel {
  min-width: 0;
}
.funnel-stage-list {
  padding-top: 12px;
}
.funnel-stage-row {
  position: relative;
  padding-right: 120px;
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.funnel-stage-row:last-child {
  margin-bottom: 0;
}
.funnel-stage {
  flex: none;
  height: 72px;
  border: 0;
  clip-path: polygon(0 0, 100% 0, 88% 100%, 12% 100%);
  background: var(--stage-color);
  opacity: 1;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  font: inherit;
  transition: filter 0.15s;
}
.funnel-stage.selected,
.funnel-stage:hover,
.funnel-stage:focus-visible {
  filter: brightness(0.95);
}
.funnel-stage > span {
  font-size: 12px;
}
.funnel-stage strong {
  font-size: 19px;
}
.funnel-stage small {
  font-size: 11px;
  font-weight: 400;
}
.funnel-stage .selected-stage-mark {
  font-size: 10px;
  height: 12px;
}
.stage-conversion {
  position: absolute;
  right: 0;
  top: 10px;
  width: 112px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: center;
}
.stage-conversion span {
  font-size: 10px;
  color: #8794a8;
}
.stage-conversion strong {
  font-size: 19px;
  color: #2873ed;
}
.composition-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #edf1f5;
  padding-left: 20px;
}
.composition-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 0 8px;
}
.composition-heading span {
  font-size: 11px;
  color: #8a98ac;
}
.composition-body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(150px, 0.7fr) minmax(0, 2fr);
  align-items: center;
  gap: 12px;
  padding: 4px 0 0;
}
.composition-table {
  width: 100%;
}
.composition-table :deep(.cell) {
  padding: 0 5px;
  line-height: 20px;
  white-space: nowrap;
  font-size: 10px;
}
.composition-table :deep(td.el-table__cell),
.composition-table :deep(th.el-table__cell) {
  padding: 7px 0;
}
.channel-drill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  padding: 0;
  color: #4285f4;
  cursor: pointer;
  font: inherit;
  white-space: nowrap;
}
.channel-drill i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}
.conversion-rate {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 5px;
  font-weight: 600;
}
.rate-above {
  color: #527dcc;
  background: #eff5ff;
}
.rate-below {
  color: #8792a2;
  background: #f5f6f8;
}
@media (max-width: 1100px) {
  .conversion-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .conversion-funnel {
    max-width: 500px;
    width: 100%;
    margin: 0 auto;
  }
  .composition-panel {
    border-left: 0;
    border-top: 1px solid #edf1f5;
    padding: 16px 0 0;
  }
}
@media (max-width: 760px) {
  .composition-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .composition-heading {
    flex-wrap: wrap;
  }
}
</style>
