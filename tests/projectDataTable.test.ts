import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import type { DashboardFilter } from '../src/types';
import {
  buildProjectDataRows,
  summarizeProjectData,
  projectDataRates,
  projectDataColumns,
} from '../src/utils/projectDataTable';
import { barOption } from '../src/charts/options';
import { summarize } from '../src/utils/metrics';
import { selectKpiDateRows } from '../src/utils/kpiDaily';
import { projectSalesStatuses } from '../src/mocks/projectSalesStatus';
const filter: DashboardFilter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
  period: ['2026-10', '2026-11'],
  metricDateRange: ['2026-10-01', '2026-11-02'],
};
const rows = buildProjectDataRows(records, filter);
for (const status of projectSalesStatuses) {
  assert.equal(rows.filter((row) => row.salesStatus === status).length, 2);
}
assert.equal(rows.filter((row) => !!row.salesStatus).length, rows.length);
const cityRows = buildProjectDataRows(records, { ...filter, organization: '上海公司' });
assert.equal(cityRows.filter((row) => row.salesStatus === '未开盘').length, 1);
assert.equal(cityRows.filter((row) => row.salesStatus === '新开盘').length, 1);
assert.equal(projectDataColumns.length, 9);
assert.deepEqual(
  projectDataColumns.map((c) => c.key),
  [
    'annualCompletion',
    'amount',
    'contracts',
    'visitConversion',
    'subscriptionUnits',
    'visitPeople',
    'leads',
    'feeRate',
    'contractCost',
  ],
);
assert.ok(rows.length > 0);
for (const row of rows) {
  const scope = { ...filter, project: row.name };
  const actual = summarize(
    selectKpiDateRows(records, scope, {
      start: '2026-01-01',
      end: '2026-11-02',
      mode: 'cumulative',
    }),
  );
  const target = summarize(
    selectKpiDateRows(records, scope, {
      start: '2026-01-01',
      end: '2026-12-31',
      mode: 'cumulative',
    }),
  );
  assert.equal(row.annualCompletion, (actual.amount / target.target) * 100);
  assert.equal(row.visitConversion, (row.contracts / row.visitPeople) * 100);
  assert.equal(row.feeRate, (row.fee / row.amount) * 100);
  assert.equal(row.contractCost, (row.fee * 10000) / row.contracts);
}
const shorter = buildProjectDataRows(records, {
  ...filter,
  period: ['2026-11', '2026-11'],
  metricDateRange: ['2026-11-01', '2026-11-02'],
});
assert.equal(
  rows[0].annualCompletion,
  shorter.find((r) => r.name === rows[0].name)?.annualCompletion,
  '年度进度不受统计起始日影响',
);
const total = summarizeProjectData(rows);
assert.equal(
  total.annualCompletion,
  (rows.reduce((s, r) => s + r.annualAmount, 0) / rows.reduce((s, r) => s + r.annualTarget, 0)) *
    100,
);
assert.equal(total.visitConversion, (total.contracts / total.visitPeople) * 100);
assert.equal(total.feeRate, (total.fee / total.amount) * 100);
assert.equal(total.contractCost, (total.fee * 10000) / total.contracts);
const zero = projectDataRates({
  ...summarize([]),
  name: '空',
  records: [],
  annualAmount: 0,
  annualTarget: 0,
});
assert.equal(zero.annualCompletion, null);
assert.equal(zero.visitConversion, null);
assert.equal(zero.feeRate, null);
assert.equal(zero.contractCost, null);
assert.deepEqual(buildProjectDataRows(records, { ...filter, project: '不存在的项目' }), []);
assert.equal((barOption([], 'amount', false).xAxis as any).axisLabel.show, false);
console.log(
  '通过：项目明细列顺序、年度截止日及全年目标、年度进度独立起始日、合计加权、零分母、排名X轴隐藏。',
);
