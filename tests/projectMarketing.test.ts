import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import type { DashboardFilter } from '../src/types';
import { projectMarketing, stageRate } from '../src/utils/projectMarketing';
import { groupRows, summarize } from '../src/utils/metrics';
const project = records[0].project;
const filter: DashboardFilter = {
  organization: records[0].organization,
  organizationNames: [records[0].organization],
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
  period: ['2026-10', '2026-10'],
  metricDateRange: ['2026-10-01', '2026-10-30'],
};
const m = projectMarketing(records, filter, project);
assert.ok(m.current.length);
assert.ok(m.current.every((r) => r.project === project && r.rangeLabel?.includes('2026-10-30')));
assert.ok(m.headquarters.projects > 1, '总部基准必须解除来源城市的组织限制');
assert.equal(
  m.summary.leads,
  groupRows(m.current, 'channel').reduce((sum, r) => sum + r.leads, 0),
);
assert.equal(
  m.summary.contracts,
  groupRows(m.current, 'channelObject').reduce((sum, r) => sum + r.contracts, 0),
);
assert.ok(m.prior.leads > 0 && m.previous.leads > 0);
assert.equal(stageRate(summarize([]), 1), null);
assert.deepEqual(projectMarketing(records, filter, '不存在的项目').current, []);
const channel = m.current[0].channel;
const selected = projectMarketing(records, { ...filter, channel }, project);
assert.ok(selected.current.every((r) => r.channel === channel));
assert.ok(selected.summary.leads < m.summary.leads);
assert.equal(
  selected.city.projects,
  new Set(records.filter((r) => r.city === m.identity?.city).map((r) => r.project)).size,
);
console.log('通过：项目路由数据隔离、总部与城市基准范围、渠道下钻汇总守恒、同环比及空数据。');
