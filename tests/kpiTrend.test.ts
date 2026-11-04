import assert from 'node:assert/strict';
import { buildKpiTrend } from '../src/utils/kpiTrend';
import { records } from '../src/mocks/data';
import { kpiDateRange, selectKpiDateRows } from '../src/utils/kpiDaily';
import { summarize } from '../src/utils/metrics';
import type { DashboardFilter, KpiKey } from '../src/types';
const filter: DashboardFilter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
  period: ['2026-01', '2026-03'],
  metricDateRange: ['2026-01-15', '2026-03-10'],
};
for (const key of ['leads', 'visitPeople', 'subscriptionUnits', 'contracts'] as KpiKey[]) {
  const daily = buildKpiTrend({ key, mode: 'yesterday', filter, rows: records });
  assert.equal(daily.points.length, 30);
  assert.equal(daily.end, '2026-03-09');
  assert.equal(daily.points[0].date, '2026-02-08');
  assert.equal(
    daily.latest,
    summarize(selectKpiDateRows(records, filter, kpiDateRange(filter, 'yesterday')))[key],
  );
  const monthly = buildKpiTrend({ key, mode: 'cumulative', filter, rows: records });
  assert.deepEqual(
    monthly.points.map((p) => p.date),
    ['2026-01', '2026-02', '2026-03'],
  );
  assert.equal(monthly.points[0].start, '2026-01-15');
  assert.equal(monthly.points[2].end, '2026-03-10');
  assert.equal(
    monthly.points.reduce((sum, p) => sum + (p.value || 0), 0),
    monthly.total,
  );
  assert.equal(
    monthly.total,
    summarize(selectKpiDateRows(records, filter, kpiDateRange(filter, 'cumulative')))[key],
  );
}
const oneMonth = buildKpiTrend({
  key: 'contracts',
  mode: 'cumulative',
  filter: {
    ...filter,
    period: ['2026-11', '2026-11'],
    metricDateRange: ['2026-11-01', '2026-11-02'],
  },
  rows: records,
});
assert.equal(oneMonth.points.length, 1);
assert.equal(oneMonth.latest, oneMonth.total);
const leap = buildKpiTrend({
  key: 'leads',
  mode: 'yesterday',
  filter: { ...filter, metricDateRange: ['2024-03-01', '2024-03-01'] },
  rows: [],
});
assert.equal(leap.end, '2024-02-29');
assert.equal(leap.start, '2024-01-31');
assert.ok(leap.points.every((p) => p.value === null));
const scoped = { ...filter, project: records[0].project, channel: records[0].channel };
const scopedTrend = buildKpiTrend({
  key: 'leads',
  mode: 'cumulative',
  filter: scoped,
  rows: records,
});
assert.equal(
  scopedTrend.total,
  summarize(selectKpiDateRows(records, scoped, kpiDateRange(scoped, 'cumulative'))).leads,
);
const zeroFacts = [{ ...records[0], period: '2026-01', leads: 0 }];
assert.equal(
  buildKpiTrend({
    key: 'leads',
    mode: 'cumulative',
    filter: {
      ...filter,
      period: ['2026-01', '2026-01'],
      metricDateRange: ['2026-01-01', '2026-01-31'],
    },
    rows: zeroFacts,
  }).latest,
  0,
);
console.log(
  '通过：四指标30日截止昨日、闰年跨月、自然月首尾截断、月合计与卡片累计对账、单点、无数据和筛选继承。',
);

import { resolveStatisticsPeriod } from '../src/utils/statisticsPeriod';
for (const [periodType, periodAnchor, count, first, last, grain] of [
  ['month', '2026-11', 12, '2025-12', '2026-11', 'month'],
  ['quarter', '2026-Q4', 4, '2026年Q1', '2026年Q4', 'quarter'],
  ['year', '2026', 3, '2024年', '2026年', 'year'],
] as const) {
  const f = resolveStatisticsPeriod(
    { ...filter, periodType, periodAnchor },
    new Date(2026, 10, 3, 12),
  );
  for (const key of ['leads', 'visitPeople', 'subscriptionUnits', 'contracts'] as KpiKey[]) {
    const trend = buildKpiTrend({ key, mode: 'cumulative', filter: f, rows: records });
    assert.equal(trend.points.length, count);
    assert.equal(trend.grain, grain);
    assert.equal(trend.points[0].date, first);
    assert.equal(trend.points[count - 1].date, last);
    assert.equal(trend.points[count - 1].end, '2026-11-03');
    assert.equal(trend.latest, trend.total, '最后一个周期点与卡片所选周期累计值一致');
    if (periodType === 'year') assert.equal(trend.points[0].value, null, '缺失年份不能展示为0');
  }
}
console.log(
  '通过：四项卡片周期趋势月12/季4/年3、截止所选周期、季度年度汇总、末期值与卡片对账、年份空缺。',
);
