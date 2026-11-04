import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import { buildAdvisorDataRows } from '../src/utils/advisorData';
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
