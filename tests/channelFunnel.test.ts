import assert from 'node:assert/strict';
import { buildChannelFunnel } from '../src/utils/channelFunnel';
import { channelCatalog } from '../src/mocks/channels';
import { records } from '../src/mocks/data';
import { filterRows, groupRows, summarize } from '../src/utils/metrics';
import { nationalChannelRows } from '../src/utils/channelBenchmark';
import type { DashboardFilter } from '../src/types';

for (const { name } of channelCatalog) {
  const selected = records.filter((r) => r.channel === name && r.period === '2026-09');
  const stages = buildChannelFunnel(selected, name);
  const mixed = buildChannelFunnel(
    records.filter((r) => r.period === '2026-09'),
    name,
  );
  assert.deepEqual(stages, mixed, 'channel isolation');
  const totals = summarize(selected);
  assert.deepEqual(
    stages.map((s) => s.name),
    ['线索', '到访', '认购', '签约'],
  );
  assert.deepEqual(
    stages.map((s) => s.unit),
    ['组', '人', '套', '套'],
  );
  assert.equal(stages[0].value, totals.leads);
  assert.equal(stages.at(-2)!.value, totals.subscriptionUnits);
  assert.equal(stages.at(-1)!.value, totals.contracts);
  assert.ok(stages.some((s) => s.value === totals.visitPeople));
  for (const [i, s] of stages.entries()) {
    assert.ok(Number.isInteger(s.value));
    if (i) {
      assert.ok(s.value <= stages[i - 1].value);
      assert.equal(s.lost, stages[i - 1].value - s.value);
      assert.equal(s.rate, stages[i - 1].value ? (s.value / stages[i - 1].value) * 100 : null);
    }
    const firstProject = selected[0].project;
    const a = buildChannelFunnel(
      selected.filter((r) => r.project === firstProject),
      name,
    );
    const b = buildChannelFunnel(
      selected.filter((r) => r.project !== firstProject),
      name,
    );
    assert.equal(s.value, a[i].value + b[i].value, 'stage values reconcile across groups');
  }
  const empty = buildChannelFunnel([], name);
  assert.ok(empty.every((s) => s.value === 0 && s.rate === null && s.cumulative === null));
}
assert.deepEqual(
  buildChannelFunnel([], '中介分销').map((s) => s.name),
  buildChannelFunnel([], '线上获客').map((s) => s.name),
);
console.log('通过：7 类渠道漏斗、筛选隔离、基础节点对账、四个环节可加总、转化率及零分母。');

const cityFilter: DashboardFilter = {
  organization: '深圳公司',
  organizationNames: ['深圳公司'],
  region: '华南区域',
  city: '深圳',
  project: '城市项目限制',
  channel: '中介分销',
  customer: '',
  basis: '签约口径',
  period: ['2026-09', '2026-09'],
  metricDateRange: ['2026-09-03', '2026-09-17'],
};
const national = nationalChannelRows(records, cityFilter, '线上获客');
const expected = filterRows(records, {
  ...cityFilter,
  organization: '',
  organizationNames: [],
  region: '',
  city: '',
  project: '',
  channel: '线上获客',
});
assert.deepEqual(national, expected);
assert.ok(new Set(national.map((r) => r.organization)).size > 1);
assert.ok(national.every((r) => r.channel === '线上获客'));
const stages = buildChannelFunnel(national, '线上获客');
const totals = summarize(national);
assert.equal(stages[1].rate, (totals.visitPeople / totals.leads) * 100);
assert.equal(stages[2].rate, (totals.subscriptionUnits / totals.visitPeople) * 100);
assert.equal(stages[3].rate, (totals.contracts / totals.subscriptionUnits) * 100);
for (const group of groupRows(national, 'channelObject')) {
  const corresponding = summarize(expected.filter((r) => r.channelObject === group.name));
  assert.equal(
    group.contracts / group.visitPeople,
    corresponding.contracts / corresponding.visitPeople,
  );
}
assert.deepEqual(nationalChannelRows([], cityFilter, '线上获客'), []);
console.log(
  '通过：全国渠道基准移除地域和项目限制、保留统计日期、同渠道同环节加权汇总及二级渠道匹配。',
);
