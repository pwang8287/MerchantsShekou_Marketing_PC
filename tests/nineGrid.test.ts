import assert from 'node:assert/strict';
import * as echarts from 'echarts';
import { records } from '../src/mocks/data';
import { channelCatalog } from '../src/mocks/channels';
import { splitAdvisorRecords } from '../src/mocks/advisors';
import { buildNineGrid, gridCells, locateCell } from '../src/utils/nineGrid';
import { nineGridOption } from '../src/charts/options/nineGrid';
import { summarize } from '../src/utils/metrics';
import type { DashboardFilter, MarketingPerformanceMetric } from '../src/types';
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
const thresholds = { x: 5, cost: 3, conversion: 3, minContracts: 10 };
assert.equal(gridCells('channel').length, 9);
assert.equal(locateCell(-5, 3, 5, 3, 'channel').name, '量本平稳');
assert.equal(locateCell(5.01, -3.01, 5, 3, 'channel').name, '增量降本');
assert.equal(locateCell(-5.01, 3.01, 5, 3, 'channel').name, '缩量增本');
assert.equal(locateCell(8, 4, 5, 3, 'advisor').name, '增量提效');
const channel = buildNineGrid(records, filter, 'channel', 'yoy', thresholds);
const project = buildNineGrid(records, filter, 'project', 'yoy', thresholds);
assert.equal(channel.points.length, channelCatalog.length);
assert.equal(project.points.length, 8);
assert.ok(project.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
assert.ok(new Set(project.points.map((p) => p.cell.id)).size > 1);
const allocated = splitAdvisorRecords(records);
assert.equal(allocated.length, records.length * 4);
assert.equal(new Set(allocated.map((r) => r.advisorId)).size, 32);
const before = summarize(records),
  after = summarize(allocated);
for (const key of [
  'amount',
  'collection',
  'target',
  'leads',
  'visits',
  'subscriptions',
  'contracts',
] as const)
  assert.equal(after[key], before[key], `${key} must reconcile`);
assert.ok(Math.abs(after.fee - before.fee) < 0.00001);
assert.ok(
  allocated.every(
    (r) => r.leads >= r.visits && r.visits >= r.subscriptions && r.subscriptions >= r.contracts,
  ),
);
const advisor = buildNineGrid(allocated, filter, 'advisor', 'yoy', thresholds);
assert.equal(advisor.points.length, 32);
const singleProject = buildNineGrid(
  allocated,
  { ...filter, project: records[0].project },
  'advisor',
  'yoy',
  thresholds,
);
assert.equal(singleProject.total, 4);
const row = (period: string, contracts: number, visits: number): MarketingPerformanceMetric => ({
  ...records[0],
  id: period,
  period,
  advisorId: 'a1',
  advisor: '示例顾问',
  contracts,
  visits,
  subscriptions: contracts,
  leads: visits + 100,
  fee: 100,
  amount: contracts * 100,
});
const known = buildNineGrid(
  [row('2025-01', 10, 100), row('2026-01', 20, 100)],
  { ...filter, period: ['2026-01', '2026-01'] },
  'advisor',
  'yoy',
  thresholds,
);
assert.equal(known.points[0].x, 100);
assert.equal(known.points[0].y, 10, 'conversion delta must use percentage points');
const invalid = buildNineGrid(
  [row('2025-01', 0, 100), row('2026-01', 20, 100)],
  { ...filter, period: ['2026-01', '2026-01'] },
  'advisor',
  'yoy',
  thresholds,
);
assert.equal(invalid.points.length, 0);
assert.equal(invalid.excluded[0].reason, '比较期签约量为零');
const newPeriod = buildNineGrid(
  records,
  { ...filter, period: ['2025-01', '2025-03'] },
  'channel',
  'yoy',
  thresholds,
);
assert.equal(newPeriod.points.length, 0);
assert.equal(newPeriod.excluded.length, channelCatalog.length);
const mom = buildNineGrid(records, filter, 'channel', 'mom', thresholds);
assert.deepEqual(mom.previousPeriod, ['2025-04', '2025-12']);
// Exercise ECharts option construction on all three populated views and empty data.
for (const [kind, result] of [
  ['channel', channel],
  ['channel', buildNineGrid(records, filter, 'channel', 'yoy', thresholds, 'object')],
  ['channel', buildNineGrid(records, filter, 'channel', 'yoy', thresholds, 'detail')],
  ['project', project],
  ['advisor', advisor],
] as const) {
  const option = nineGridOption(result, kind, thresholds, '', '', false);
  assert.ok(Array.isArray(option.series));
  assert.equal(option.series[0].markArea?.data?.length, 9);
  const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 1100, height: 440 });
  chart.setOption({ ...option, animation: false });
  const svg = chart.renderToSVGString();
  assert.ok(svg.includes('<svg'));
  assert.ok(!svg.includes('NaN'));
  for (const cell of result.cells) assert.ok(svg.includes(cell.name));
  chart.dispose();
}
assert.ok(nineGridOption(newPeriod, 'channel', thresholds, '', '', false));
console.log('通过：九宫格边界、百分点口径、比较基数、顾问业绩守恒、组合筛选及三类图表配置。');
