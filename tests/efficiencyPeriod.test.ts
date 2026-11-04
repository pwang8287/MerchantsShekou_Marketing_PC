import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { computed } from 'vue';
import { records } from '../src/mocks/data';
import { useDashboardStore } from '../src/stores/dashboard';
import { calculateMarketingEfficiency } from '../src/utils/efficiency';
import { resolveStatisticsPeriod } from '../src/utils/statisticsPeriod';
import { buildEfficiencyTrendData } from '../src/utils/efficiencyTrendData';
import { selectKpiDateRows } from '../src/utils/kpiDaily';
import { summarize } from '../src/utils/metrics';
import { efficiencyPeriodTrendOption } from '../src/charts/options';
import type { DashboardFilter, StatisticsPeriodType } from '../src/types';
const base: DashboardFilter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
  period: ['2026-11', '2026-11'],
};
const now = new Date(2026, 10, 3, 12);
const f = (type: StatisticsPeriodType, anchor: string) =>
  resolveStatisticsPeriod({ ...base, periodType: type, periodAnchor: anchor }, now);
setActivePinia(createPinia());
const store = useDashboardStore();
store.rows = records;
const efficiency = computed(() => calculateMarketingEfficiency(store.filtered));
let previousFee = 0;
for (const filter of [f('month', '2026-11'), f('quarter', '2026-Q4'), f('year', '2026')]) {
  store.applyFilter(filter);
  const s = summarize(
    selectKpiDateRows(records, filter, {
      start: filter.metricDateRange![0],
      end: filter.metricDateRange![1],
      mode: 'cumulative',
    }),
  );
  assert.equal(efficiency.value.fee, s.fee);
  assert.equal(efficiency.value.feeRate, (s.fee / s.amount) * 100);
  assert.equal(efficiency.value.leadCost, (s.fee * 10000) / s.leads);
  assert.equal(efficiency.value.visitCost, (s.fee * 10000) / s.visits);
  assert.equal(efficiency.value.acquisitionCost, (s.fee * 10000) / s.contracts);
  assert.equal(efficiency.value.roi, s.amount / s.fee);
  assert.ok(efficiency.value.fee > previousFee, '切换周期立即更新，无需重新查询');
  previousFee = efficiency.value.fee;
}
const month = buildEfficiencyTrendData(records, f('month', '2026-08'));
assert.equal(month.points.length, 12);
assert.equal(month.points[0].label, '2025-09');
assert.equal(month.points[11].label, '2026-08');
assert.equal(month.end, '2026-08-31');
const quarter = buildEfficiencyTrendData(records, f('quarter', '2026-Q3'));
assert.deepEqual(
  quarter.points.map((p) => p.label),
  ['2025年Q4', '2026年Q1', '2026年Q2', '2026年Q3'],
);
const currentQuarter = buildEfficiencyTrendData(records, f('quarter', '2026-Q4'));
assert.equal(currentQuarter.points[3].end, '2026-11-03');
assert.equal(currentQuarter.points[2].end, '2026-09-30');
for (const p of currentQuarter.points) {
  const s = summarize(p.records);
  assert.equal(p.fee, s.fee);
  assert.equal(p.roi, s.amount / s.fee, '季度投入产出比按合计重算');
}
const year = buildEfficiencyTrendData(records, f('year', '2026'));
assert.deepEqual(
  year.points.map((p) => p.label),
  ['2024年', '2025年', '2026年'],
);
assert.equal(year.points[0].fee, null, '没有源数据的年份不能伪造为零');
assert.equal(year.points[2].end, '2026-11-03');
const custom = buildEfficiencyTrendData(records, {
  ...base,
  periodType: 'custom',
  period: ['2026-01', '2026-03'],
  metricDateRange: ['2026-01-15', '2026-03-10'],
});
assert.equal(custom.points.length, 3);
assert.equal(custom.points[0].start, '2026-01-15');
assert.equal(custom.points[2].end, '2026-03-10');
const scoped = buildEfficiencyTrendData(records, {
  ...f('quarter', '2026-Q4'),
  organization: '深圳公司',
});
assert.ok(scoped.points.every((p) => p.records.every((r) => r.organization === '深圳公司')));
const chart = efficiencyPeriodTrendOption(currentQuarter.points) as any;
assert.equal(chart.series[0].data.length, 4);
assert.equal(chart.series[1].data[3], currentQuarter.points[3].roi);
assert.ok(chart.tooltip.formatter([{ dataIndex: 3 }]).includes('2026-10-01 至 2026-11-03'));
console.log(
  '通过：周期切换即时重算六项效率指标、月12/季4/年3滚动窗口末尾选中周期、季度加权、历史完整/当前截止、空缺年份、组织筛选与自定义边界。',
);
