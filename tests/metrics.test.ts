import { efficiencyTrend } from '../src/charts/options';
import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import { channelLeaves } from '../src/mocks/channels';
import {
  filterRows,
  groupRows,
  summarize,
  shiftPeriod,
  previousPeriod,
  change,
} from '../src/utils/metrics';
import type { DashboardFilter } from '../src/types';
const filter: DashboardFilter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
  period: ['2026-01', '2026-09'],
};
assert.equal(records.length, 24 * 8 * channelLeaves.length * 3);
assert.equal(new Set(records.map((r) => r.id)).size, records.length);
assert.ok(
  records.every(
    (r) => r.leads >= r.visits && r.visits >= r.subscriptions && r.subscriptions >= r.contracts,
  ),
);
const selected = filterRows(records, filter);
assert.equal(selected.length, 9 * 8 * channelLeaves.length * 3);
const summary = summarize(selected);
assert.equal(
  summary.amount,
  selected.reduce((a, r) => a + r.amount, 0),
);
assert.equal(summary.conversion, (summary.contracts / summary.leads) * 100);
assert.equal(summary.acquisition, (summary.fee * 10000) / summary.contracts);
assert.equal(
  groupRows(selected, 'project').reduce((a, r) => a + r.amount, 0),
  summary.amount,
);
const narrowed = filterRows(records, {
  ...filter,
  region: '华南区域',
  city: '深圳',
  channel: '老带新',
  customer: '改善客群',
});
assert.equal(narrowed.length, 9 * channelLeaves.filter((l) => l.channel === '老带新').length);
assert.ok(
  narrowed.every((r) => r.city === '深圳' && r.channel === '老带新' && r.customer === '改善客群'),
);
assert.deepEqual(shiftPeriod(filter.period, -12), ['2025-01', '2025-09']);
assert.deepEqual(previousPeriod(filter.period), ['2025-04', '2025-12']);
assert.deepEqual(previousPeriod(['2026-01', '2026-01']), ['2025-12', '2025-12']);
assert.equal(summarize([]).conversion, 0);
assert.equal(summarize([]).roi, 0);
assert.ok(Number.isNaN(change(100, 0)));
assert.equal(filterRows(records, { ...filter, period: ['2030-01', '2030-02'] }).length, 0);
console.log('通过：记录唯一性、漏斗一致性、组合筛选、加权汇总、跨年比较及空数据处理。');

// 近12个月趋势保留跨年月份，并将数据缺失与真实零值区分。

const months = Array.from({ length: 12 }, (_, i) => shiftPeriod(['2026-11', '2026-11'], i - 11)[0]);
assert.equal(months[0], '2025-12');
assert.equal(months[11], '2026-11');
const rollingFilter: DashboardFilter = {
  ...filter, organization: '', region: '', city: '', project: '', channel: '', customer: '',
  period: ['2025-12', '2026-11'], metricDateRange: ['2025-12-01', '2026-11-02'],
};
const rolling = filterRows(records, rollingFilter);
assert.equal(summarize(rolling.filter(r => r.period === '2026-10')).fee, summarize(records.filter(r => r.period === '2026-10')).fee);
assert.ok(summarize(rolling.filter(r => r.period === '2026-11')).fee < summarize(records.filter(r => r.period === '2026-11')).fee);
const chart = efficiencyTrend(rolling, months) as any;
assert.deepEqual(chart.xAxis.data, months);
assert.equal(chart.series[0].data.length, 12);
assert.equal(chart.series[0].data[10], Math.round(summarize(records.filter(r => r.period === '2026-10')).fee));
const emptyTrend = efficiencyTrend([], months) as any;
assert.ok(emptyTrend.series.every((s: any) => s.data.length === 12 && s.data.every((v: unknown) => v === null)));
console.log('通过：近12个月跨年坐标、历史整月与截止日统计、缺失月份空值。');
