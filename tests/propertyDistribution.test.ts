import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import { summarize } from '../src/utils/metrics';
import {
  buildPropertyDistribution,
  sumPropertyDistribution,
} from '../src/utils/propertyDistribution';
const rows = records.filter((row) => row.period === '2026-10');
const cells = buildPropertyDistribution(rows, '2026-10');
for (const metric of ['subscriptionUnits', 'contracts'] as const) {
  const expected = summarize(rows)[metric];
  for (const dimension of ['property', 'area', 'group', 'organization', 'project'] as const) {
    assert.equal(
      sumPropertyDistribution(cells, dimension, metric).reduce((sum, row) => sum + row.value, 0),
      expected,
    );
  }
}
for (const property of [...new Set(cells.map((cell) => cell.property))]) {
  for (const area of [...new Set(cells.map((cell) => cell.area))]) {
    const filtered = cells.filter((cell) => cell.property === property && cell.area === area);
    for (const metric of ['available', 'subscriptionUnits', 'contracts'] as const) {
      const total = filtered.reduce((sum, cell) => sum + cell[metric], 0);
      assert.ok(Number.isInteger(total) && total >= 0);
      assert.equal(
        sumPropertyDistribution(filtered, 'group', metric).reduce((sum, row) => sum + row.value, 0),
        total,
      );
      assert.equal(
        sumPropertyDistribution(filtered, 'project', metric).reduce(
          (sum, row) => sum + row.value,
          0,
        ),
        total,
      );
    }
  }
}
assert.deepEqual(buildPropertyDistribution(rows, '2026-10'), cells);
assert.deepEqual(buildPropertyDistribution([], '2026-10'), []);
console.log('通过：业态/面积段/组织分布合计守恒、非负整数、稳定模拟及空数据。');
