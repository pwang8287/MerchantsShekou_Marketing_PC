import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { useDashboardStore } from '../src/stores/dashboard';
import { useDashboard } from '../src/composables/useDashboard';
import {
  resolveStatisticsPeriod,
  statisticsPeriodPrefix,
  formatStatisticsPeriod,
} from '../src/utils/statisticsPeriod';
import { comparableDateRanges, kpiDateRange, selectKpiDateRows } from '../src/utils/kpiDaily';
import { filterRows, summarize, fmt } from '../src/utils/metrics';
import { records } from '../src/mocks/data';
import { buildKpiDrilldown } from '../src/utils/kpiDrilldown';
import { buildProjectDataRows } from '../src/utils/projectDataTable';
import { buildNineGrid } from '../src/utils/nineGrid';
import type { DashboardFilter, StatisticsPeriodType } from '../src/types';
const now = new Date(2026, 10, 2, 12);
const base: DashboardFilter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
  period: ['2026-11', '2026-11'],
  metricDateRange: ['2026-11-01', '2026-11-02'],
};
const build = (type: StatisticsPeriodType, anchor: string) =>
  resolveStatisticsPeriod({ ...base, periodType: type, periodAnchor: anchor }, now);
assert.deepEqual(build('month', '2026-11').metricDateRange, ['2026-11-01', '2026-11-02']);
assert.deepEqual(build('quarter', '2026-Q4').metricDateRange, ['2026-10-01', '2026-11-02']);
assert.deepEqual(build('year', '2026').metricDateRange, ['2026-01-01', '2026-11-02']);
assert.deepEqual(build('month', '2026-09').metricDateRange, ['2026-09-01', '2026-09-30']);
assert.deepEqual(build('quarter', '2026-Q3').metricDateRange, ['2026-07-01', '2026-09-30']);
assert.deepEqual(build('year', '2025').metricDateRange, ['2025-01-01', '2025-12-31']);
const historical = build('month', '2026-09');
const compare = comparableDateRanges(kpiDateRange(historical, 'cumulative'), historical);
assert.equal(compare.previous.start, '2026-08-01');
assert.equal(compare.previous.end, '2026-08-31');
assert.equal(compare.prior.start, '2025-09-01');
assert.equal(compare.prior.end, '2025-09-30');
const leap = build('month', '2024-02');
assert.equal(leap.metricDateRange?.[1], '2024-02-29');
assert.equal(comparableDateRanges(kpiDateRange(leap, 'cumulative'), leap).prior.end, '2023-02-28');
const quarter = build('quarter', '2026-Q4');
const qcompare = comparableDateRanges(kpiDateRange(quarter, 'cumulative'), quarter);
assert.equal(qcompare.prior.end, '2025-11-02');
assert.equal(qcompare.previous.start, '2026-07-01');
assert.equal(qcompare.previous.end, '2026-08-02');
const custom = resolveStatisticsPeriod(
  { ...base, periodType: 'custom', metricDateRange: ['2026-04-10', '2026-05-05'] },
  now,
);
assert.deepEqual(custom.metricDateRange, ['2026-04-10', '2026-05-05']);
const customCompare = comparableDateRanges(kpiDateRange(custom, 'cumulative'), custom);
assert.equal(
  new Date(customCompare.previous.end).getTime() - new Date(customCompare.previous.start).getTime(),
  new Date('2026-05-05').getTime() - new Date('2026-04-10').getTime(),
);
assert.deepEqual(
  ['month', 'quarter', 'year', 'custom'].map((t) =>
    statisticsPeriodPrefix(t as StatisticsPeriodType),
  ),
  ['月度', '季度', '年度', '累计'],
);
// 当前季度中已结束月份按整月统计，不能被当前月截止日截断。
assert.equal(
  summarize(filterRows(records, quarter, ['2026-10', '2026-10'])).leads,
  summarize(records.filter((r) => r.period === '2026-10')).leads,
);
const grid = buildNineGrid(records, quarter, 'project', 'mom', {
  x: 5,
  cost: 3,
  conversion: 1,
  minContracts: 1,
});
assert.deepEqual(grid.previousPeriod, ['2026-07', '2026-08']);
setActivePinia(createPinia());
const store = useDashboardStore();
store.rows = records;
const { kpis } = useDashboard();
for (const f of [build('month', '2026-09'), quarter, build('year', '2026'), custom]) {
  store.filter = f;
  const total = summarize(selectKpiDateRows(records, f, kpiDateRange(f, 'cumulative')));
  for (const k of kpis.value) {
    assert.equal(k.value, fmt(total[k.key]));
    store.openKpiDetail(k.key, 'cumulative');
    const detail = buildKpiDrilldown(store.kpiDetailContext!, []);
    assert.equal(detail.totals.value, total[k.key]);
  }
  assert.equal(store.summary.leads, total.leads);
  assert.equal(
    buildProjectDataRows(records, f).reduce((s, r) => s + r.contracts, 0),
    total.contracts,
  );
}
console.log(
  '通过：月季年及自定义范围、当前周期截止日、完整自然月环比、闰年同比、季度比较、卡片/下钻/项目表统计一致。',
);

// 认购、签约目标达成率：当前周期实际量 / 完整自然周期目标；自定义保留年度口径。
import { calendarBounds, periodAnchor } from '../src/utils/statisticsPeriod';
for (const f of [
  build('month', '2026-11'),
  build('quarter', '2026-Q4'),
  build('year', '2026'),
  custom,
]) {
  store.filter = f;
  const type = f.periodType === 'custom' ? 'year' : f.periodType!;
  const end = f.metricDateRange![1];
  const bounds = calendarBounds(type as 'month' | 'quarter' | 'year', periodAnchor(type, end));
  const target = summarize(selectKpiDateRows(records, f, { ...bounds, mode: 'cumulative' }));
  const actual = summarize(
    selectKpiDateRows(records, f, {
      start: f.periodType === 'custom' ? end.slice(0, 4) + '-01-01' : f.metricDateRange![0],
      end,
      mode: 'cumulative',
    }),
  );
  for (const key of ['subscriptionUnits', 'contracts'] as const) {
    const goal = kpis.value.find((k) => k.key === key)!.targetProgress!;
    assert.equal(
      goal.target,
      key === 'subscriptionUnits' ? target.subscriptionTargetUnits : target.target,
    );
    assert.equal(
      goal.actual,
      key === 'subscriptionUnits' ? actual.subscriptionUnits : actual.amount,
    );
    assert.equal(goal.rate, (goal.actual / goal.target) * 100);
    if (f.periodType !== 'custom')
      assert.equal(
        goal.title,
        statisticsPeriodPrefix(f.periodType) +
          (key === 'subscriptionUnits' ? '认购' : '签约') +
          '目标达成率',
      );
  }
}
store.filter = build('month', '2026-11');
store.rows = records
  .filter((r) => r.period === '2026-11')
  .map((r) => ({ ...r, target: 0, subscriptionTargetUnits: 0 }));
assert.equal(kpis.value.find((k) => k.key === 'contracts')!.targetProgress!.rate, null);
assert.equal(kpis.value.find((k) => k.key === 'subscriptionUnits')!.targetProgress!.rate, null);
console.log(
  '通过：认购及签约按月/季/年度完整目标计算，期内实际截止所选日期，自定义保留年度与零目标保护。',
);

store.rows = records;
for (const f of [
  build('month', '2026-11'),
  build('quarter', '2026-Q4'),
  build('year', '2026'),
  custom,
]) {
  store.filter = f;
  const end = f.metricDateRange![1];
  const actual = summarize(
    selectKpiDateRows(records, f, {
      start: f.periodType === 'custom' ? end.slice(0, 4) + '-01-01' : f.metricDateRange![0],
      end,
      mode: 'cumulative',
    }),
  );
  const conversion = kpis.value.find((k) => k.key === 'visitPeople')!.conversionProgress!;
  assert.equal(conversion.rate, (actual.subscriptionUnits / actual.visitPeople) * 100);
  assert.equal(
    conversion.title,
    (f.periodType === 'custom' ? '年度' : statisticsPeriodPrefix(f.periodType)) + '到访转认购率',
  );
}
store.rows = records.filter((r) => r.period === '2026-11').map((r) => ({ ...r, visitPeople: 0 }));
store.filter = build('month', '2026-11');
assert.equal(kpis.value.find((k) => k.key === 'visitPeople')!.conversionProgress!.rate, null);
console.log('通过：到访转认购率按月/季/年度及自定义对应口径计算，零到访保护。');

assert.equal(
  formatStatisticsPeriod({ ...base, periodType: 'month', periodAnchor: '2026-02' }),
  '2026年02月',
);
for (const q of [1, 2, 3, 4]) {
  assert.equal(
    formatStatisticsPeriod({ ...base, periodType: 'quarter', periodAnchor: `2026-Q${q}` }),
    `2026年Q${q}`,
  );
}
assert.equal(
  formatStatisticsPeriod({ ...base, periodType: 'year', periodAnchor: '2025' }),
  '2025年',
);
assert.equal(
  formatStatisticsPeriod({
    ...base,
    periodType: 'custom',
    metricDateRange: ['2025-12-02', '2026-02-03'],
  }),
  '2025年12月02日 - 2026年02月03日',
);
console.log('通过：渠道弹窗与环形图提示框共用月、季、年及自定义统计周期格式。');
