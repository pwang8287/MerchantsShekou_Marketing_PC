import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import { projectFloorPlans } from '../src/mocks/projectFloorPlans';
import { buildCustomerStructure } from '../src/utils/customerStructure';
import { filterRows, summarize } from '../src/utils/metrics';

for (const project of Object.keys(projectFloorPlans)) {
  for (const channel of ['', '线上获客']) {
    const selected = filterRows(records, {
      organization: '',
      region: '',
      city: '',
      project,
      channel,
      customer: '',
      basis: '签约口径',
      period: ['2026-10', '2026-11'],
      metricDateRange: ['2026-10-28', '2026-11-03'],
    });
    const rows = buildCustomerStructure(selected);
    const total = summarize(selected);
    assert.equal(
      rows.reduce((sum, row) => sum + row.visits, 0),
      total.visitPeople,
    );
    assert.equal(
      rows.reduce((sum, row) => sum + row.subscriptions, 0),
      total.subscriptionUnits,
    );
    assert.equal(
      rows.reduce((sum, row) => sum + row.contracts, 0),
      total.contracts,
    );
    for (const row of rows) {
      assert.match(row.name, /^\d室\d厅\d+㎡$/);
      assert.ok(row.contracts <= row.subscriptions && row.subscriptions <= row.visits);
      assert.ok(Number.isInteger(row.visits) && Number.isInteger(row.contracts));
      assert.equal(row.conversion, row.visits ? (row.contracts / row.visits) * 100 : null);
      assert.equal(
        row.visitShare,
        total.visitPeople ? (row.visits / total.visitPeople) * 100 : null,
      );
    }
    assert.deepEqual(rows, buildCustomerStructure(selected), '户型模拟结果稳定');
  }
}
const zero = buildCustomerStructure([
  { ...records[0], visitPeople: 0, subscriptionUnits: 0, contracts: 0 },
]);
assert.ok(
  zero.every((row) => row.visits === 0 && row.conversion === null && row.visitShare === null),
);
assert.deepEqual(buildCustomerStructure([]), []);
const all = buildCustomerStructure(records.filter((row) => row.period === '2026-11'));
const total = summarize(records.filter((row) => row.period === '2026-11'));
assert.equal(
  all.reduce((sum, row) => sum + row.visits, 0),
  total.visitPeople,
);
assert.equal(
  all.reduce((sum, row) => sum + row.contracts, 0),
  total.contracts,
);
console.log(
  '通过：8 项目模拟户型格式、到访/认购/签约对账、渠道日期筛选、整数与环节约束、转化率及空数据。',
);
