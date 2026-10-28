import assert from 'node:assert/strict';
import { buildChannelFunnel } from '../src/utils/channelFunnel';
import { channelCatalog } from '../src/mocks/channels';
import { records } from '../src/mocks/data';
import { summarize } from '../src/utils/metrics';

for (const { name } of channelCatalog) {
  const selected = records.filter((r) => r.channel === name && r.period === '2026-09');
  const stages = buildChannelFunnel(selected, name);
  const mixed = buildChannelFunnel(records.filter((r) => r.period === '2026-09'), name);
  assert.deepEqual(stages, mixed, 'channel isolation');
  const totals = summarize(selected);
  assert.equal(stages[0].value, totals.leads);
  assert.equal(stages.at(-2)!.value, totals.subscriptions);
  assert.equal(stages.at(-1)!.value, totals.contracts);
  assert.ok(stages.some((s) => s.value === totals.visits));
  for (const [i, s] of stages.entries()) {
    assert.ok(Number.isInteger(s.value));
    if (i) {
      assert.ok(s.value <= stages[i - 1].value);
      assert.equal(s.lost, stages[i - 1].value - s.value);
      assert.equal(s.rate, stages[i - 1].value ? s.value / stages[i - 1].value * 100 : null);
    }
    const firstProject = selected[0].project;
    const a = buildChannelFunnel(selected.filter((r) => r.project === firstProject), name);
    const b = buildChannelFunnel(selected.filter((r) => r.project !== firstProject), name);
    assert.equal(s.value, a[i].value + b[i].value, 'intermediate values reconcile across groups');
  }
  const empty = buildChannelFunnel([], name);
  assert.ok(empty.every((s) => s.value === 0 && s.rate === null && s.cumulative === null));
}
assert.notDeepEqual(
  buildChannelFunnel([], '中介分销').map((s) => s.name),
  buildChannelFunnel([], '线上获客').map((s) => s.name),
);
console.log('通过：7 类渠道漏斗、筛选隔离、基础节点对账、中间环节可加总、转化率及零分母。');
