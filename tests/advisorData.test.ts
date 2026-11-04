import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import { buildAdvisorDataRows, buildAdvisorProjectRows } from '../src/utils/advisorData';
import { filterRows, summarize } from '../src/utils/metrics';
import { selectKpiDateRows } from '../src/utils/kpiDaily';
import { buildCustomerStructure } from '../src/utils/customerStructure';
import type { DashboardFilter } from '../src/types';
const filter: DashboardFilter = {
  organization: '',
  region: '',
  city: '',
  project: '深圳·招商玺家园',
  channel: '',
  customer: '',
  basis: '签约口径',
  period: ['2026-11', '2026-11'],
  metricDateRange: ['2026-11-01', '2026-11-03'],
};
for (const range of [
  ['2026-11-01', '2026-11-03'],
  ['2026-10-01', '2026-11-03'],
  ['2026-01-01', '2026-11-03'],
] as [string, string][]) {
  const selected = {
    ...filter,
    period: [range[0].slice(0, 7), range[1].slice(0, 7)] as [string, string],
    metricDateRange: range,
  };
  const advisors = buildAdvisorDataRows(records, selected);
  const total = summarize(filterRows(records, selected));
  assert.equal(advisors.length, 4);
  for (const key of [
    'amount',
    'contracts',
    'visitPeople',
    'subscriptionUnits',
    'leads',
    'fee',
  ] as const) {
    assert.ok(
      Math.abs(advisors.reduce((sum, advisor) => sum + advisor[key], 0) - total[key]) < 1e-6,
      key + '对账',
    );
    assert.ok(advisors.every((row) => row[key] >= 0));
  }
  const annual = summarize(
    selectKpiDateRows(records, selected, {
      start: '2026-01-01',
      end: '2026-11-03',
      mode: 'cumulative',
    }),
  );
  assert.equal(
    advisors.reduce((sum, row) => sum + row.annualAmount, 0),
    annual.amount,
  );
  for (const row of advisors) {
    const plans = buildCustomerStructure(row.records);
    assert.equal(
      plans.reduce((sum, plan) => sum + plan.visits, 0),
      row.visitPeople,
    );
    assert.equal(
      plans.reduce((sum, plan) => sum + plan.subscriptions, 0),
      row.subscriptionUnits,
    );
    assert.equal(
      plans.reduce((sum, plan) => sum + plan.contracts, 0),
      row.contracts,
    );
    assert.ok(row.records.every((r) => r.project === filter.project && r.advisor === row.name));
    assert.equal(
      row.visitConversion,
      row.visitPeople ? (row.contracts / row.visitPeople) * 100 : null,
    );
  }
}
assert.deepEqual(buildAdvisorDataRows([], filter), []);
console.log('通过：顾问排名与明细同源、部分月份/季度/年度项目总额守恒、顾问范围及零分母。');

const sharedRows = records.filter((row) => row.period === '2026-11').map((row) => ({ ...row, advisor: '跨项目顾问', advisorId: 'shared-advisor' }));
const allFilter = { ...filter, project: '' };
const shared = buildAdvisorProjectRows(sharedRows, allFilter);
assert.equal(shared.length, new Set(sharedRows.map((row) => row.project)).size);
assert.ok(shared.every((row) => row.name === '跨项目顾问' && new Set(row.records.map((record) => record.project)).size === 1));
const expected = summarize(filterRows(sharedRows, allFilter));
assert.equal(shared.reduce((sum, row) => sum + row.contracts, 0), expected.contracts);
assert.equal(shared.reduce((sum, row) => sum + row.amount, 0), expected.amount);
assert.equal(shared.reduce((sum, row) => sum + row.visitPeople, 0), expected.visitPeople);
console.log('通过：同一顾问跨多个项目独立成行、项目范围隔离、签约/金额/接待人数加总守恒。');
