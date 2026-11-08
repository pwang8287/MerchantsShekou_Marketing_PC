import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import {
  organizationContribution,
  type OrganizationContributionNode,
} from '../src/utils/organizationContribution';
import { selectOrganizationFilter } from '../src/utils/organizationFilter';
import { filterRows, summarize } from '../src/utils/metrics';
import type { DashboardFilter } from '../src/types';
const base: DashboardFilter = {
  period: ['2026-01', '2026-11'],
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
};
for (const filter of [
  base,
  selectOrganizationFilter(base, '南部城市群'),
  selectOrganizationFilter(base, '上海公司'),
]) {
  for (const metric of ['leads', 'visitPeople', 'subscriptionUnits', 'contracts'] as const) {
    const result = organizationContribution(records, filter, metric);
    assert.equal(result.total, summarize(filterRows(records, filter))[metric]);
    assert.equal(
      result.nodes.reduce((sum, node) => sum + node.value, 0),
      result.total,
    );
    const visit = (nodes: OrganizationContributionNode[]) =>
      nodes.forEach((node) => {
        assert.equal(
          Object.values(node.channels).reduce((a, b) => a + b, 0),
          node.value,
        );
        if (node.children) {
          assert.equal(
            node.children.reduce((sum, child) => sum + child.value, 0),
            node.value,
          );
          visit(node.children);
        }
      });
    visit(result.nodes);
  }
}
function depth(nodes: OrganizationContributionNode[]): number {
  return nodes.length ? 1 + Math.max(...nodes.map((node) => depth(node.children || []))) : 0;
}
assert.equal(depth(organizationContribution(records, base, 'visitPeople').nodes), 3);
assert.equal(
  depth(
    organizationContribution(records, selectOrganizationFilter(base, '南部城市群'), 'visitPeople')
      .nodes,
  ),
  2,
);
assert.equal(
  depth(
    organizationContribution(records, selectOrganizationFilter(base, '上海公司'), 'visitPeople')
      .nodes,
  ),
  1,
);
const city = organizationContribution(
  records,
  selectOrganizationFilter(base, '上海公司'),
  'visitPeople',
);
assert.ok(city.nodes.every((node) => !node.children));
assert.deepEqual(organizationContribution([], base, 'contracts'), { total: 0, nodes: [] });
console.log('通过：组织贡献城市群/城市/项目逐级汇总守恒、渠道列加总、组织范围及空数据。');
