import assert from 'node:assert/strict';
import { channelRankingDimensions, channelRankingRows } from '../src/utils/channelRanking';
import { records } from '../src/mocks/data';
import { selectOrganizationFilter } from '../src/utils/organizationFilter';
import { filterRows, summarize } from '../src/utils/metrics';
import type { DashboardFilter } from '../src/types';
const base: DashboardFilter = {
  period: ['2026-01', '2026-11'],
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '线上获客',
  customer: '',
  basis: '签约口径',
};
assert.deepEqual(channelRankingDimensions(base), ['group', 'organization', 'project']);
const groupFilter = selectOrganizationFilter(base, '南部城市群');
groupFilter.channel = '线上获客';
assert.deepEqual(channelRankingDimensions(groupFilter), ['organization', 'project']);
const cityFilter = selectOrganizationFilter(base, '上海公司');
cityFilter.channel = '线上获客';
assert.deepEqual(channelRankingDimensions(cityFilter), ['project']);
assert.deepEqual(channelRankingDimensions(base, '上海公司'), ['project']);
for (const filter of [base, groupFilter, cityFilter]) {
  const rows = filterRows(records, filter);
  for (const dimension of channelRankingDimensions(filter)) {
    for (const metric of ['leads', 'visitPeople', 'subscriptionUnits', 'contracts'] as const) {
      const groups = channelRankingRows(rows, dimension, metric);
      assert.equal(
        groups.reduce((sum, row) => sum + row.value, 0),
        summarize(rows)[metric],
      );
      assert.ok(groups.every((row, index) => !index || groups[index - 1].value >= row.value));
    }
  }
}
assert.deepEqual(channelRankingRows([], 'project', 'visitPeople'), []);
console.log('通过：渠道排名总部/城市群/城市动态页签、四环节分层汇总守恒、降序排名及空数据。');
