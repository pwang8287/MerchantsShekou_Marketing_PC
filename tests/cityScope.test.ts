import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { useDashboardStore, defaultFilter } from '../src/stores/dashboard';
import { useDashboard } from '../src/composables/useDashboard';
import { records } from '../src/mocks/data';
import { resolveStatisticsPeriod } from '../src/utils/statisticsPeriod';
import { filterRows, fmt, groupRows, summarize } from '../src/utils/metrics';
import { selectKpiDateRows, kpiDateRange } from '../src/utils/kpiDaily';
import { buildProjectDataRows } from '../src/utils/projectDataTable';
import { buildEfficiencyTrendData } from '../src/utils/efficiencyTrendData';
import { buildKpiTrend } from '../src/utils/kpiTrend';
import { selectOrganizationFilter } from '../src/utils/organizationFilter';
setActivePinia(createPinia());
const store = useDashboardStore();
store.rows = records;
store.applyFilter({
  ...defaultFilter(),
  organization: '深圳公司',
  organizationLabel: '深圳公司',
  organizationNames: ['深圳公司'],
  region: '华南区域',
  city: '深圳',
});
store.drawer = true;
store.kpiDetailVisible = true;
store.setCityScope('上海公司');
assert.equal(store.drawer, false);
assert.equal(store.kpiDetailVisible, false);
assert.equal(store.filter.organization, '上海公司');
assert.deepEqual(store.filter.organizationNames, []);
assert.equal(store.filter.region, '');
assert.equal(store.filter.city, '');
assert.ok(store.filtered.length > 0 && store.filtered.every((r) => r.organization === '上海公司'));
const { kpis } = useDashboard();
for (const [periodType, periodAnchor] of [
  ['month', '2026-11'],
  ['quarter', '2026-Q4'],
  ['year', '2026'],
] as const) {
  const filter = resolveStatisticsPeriod(
    { ...store.filter, periodType, periodAnchor },
    new Date(2026, 10, 3, 12),
  );
  store.applyFilter(filter);
  assert.equal(store.cityScope, '上海公司');
  const expected = filterRows(records, {
    ...filter,
    organization: '上海公司',
    organizationNames: [],
    region: '',
    city: '',
    project: '',
  });
  assert.equal(store.summary.amount, summarize(expected).amount);
  for (const k of kpis.value) assert.equal(k.value, fmt(store.summary[k.key]));
  const projects = buildProjectDataRows(store.rows, store.filter);
  assert.equal(projects.length, 2);
  assert.ok(projects.every((p) => p.records.every((r) => r.organization === '上海公司')));
  assert.equal(
    projects.reduce((s, p) => s + p.contracts, 0),
    store.summary.contracts,
  );
  assert.equal(
    groupRows(store.filtered, 'channel').reduce((s, r) => s + r.leads, 0),
    store.summary.leads,
  );
  assert.ok(
    buildEfficiencyTrendData(store.rows, store.filter).points.every((p) =>
      p.records.every((r) => r.organization === '上海公司'),
    ),
  );
  const trend = buildKpiTrend({
    key: 'contracts',
    mode: 'cumulative',
    filter: store.filter,
    rows: store.rows,
  });
  assert.equal(trend.total, store.summary.contracts);
  store.openKpiDetail('leads', 'cumulative');
  assert.equal(store.kpiDetailContext!.filter.organization, '上海公司');
  assert.equal(
    summarize(selectKpiDateRows(records, store.filter, kpiDateRange(store.filter, 'cumulative')))
      .leads,
    store.summary.leads,
  );
}
// 重置筛选也不能跳出路由限定的公司。
store.applyFilter(defaultFilter());
assert.equal(store.filter.organization, '上海公司');
assert.ok(store.filtered.every((r) => r.organization === '上海公司'));
store.setCityScope('');
assert.equal(store.filter.organization, '深圳公司');
assert.deepEqual(Array.from(store.filter.organizationNames || []), ['深圳公司']);
assert.ok(store.filtered.every((r) => r.organization === '深圳公司'));
store.setCityScope('不存在的公司');
assert.deepEqual(store.filtered, []);
// 直接进入城市页不依赖上一次页面选择或任何持久化状态。
setActivePinia(createPinia());
const direct = useDashboardStore();
direct.rows = records;
direct.setCityScope('广州公司');
assert.ok(
  direct.filtered.length > 0 && direct.filtered.every((r) => r.organization === '广州公司'),
);
direct.setCityScope('');
assert.equal(direct.filter.organization, '');
// 组织栏切换城市群后清除原城市/项目限制，所有模块共用所属公司的汇总范围。
for (const group of ['南部城市群', '东部城市群', '西部城市群', '北部城市群']) {
  const selected = selectOrganizationFilter(
    { ...direct.filter, organization: '上海公司', project: '旧项目' },
    group,
  );
  direct.setCityScope('');
  direct.applyFilter(selected);
  assert.equal(direct.cityScope, '');
  assert.equal(direct.filter.organizationLabel, group);
  assert.equal(direct.filter.organization, '');
  assert.equal(direct.filter.project, '');
  assert.ok(direct.filtered.every((r) => selected.organizationNames!.includes(r.organization)));
  const companies = groupRows(direct.filtered, 'organization');
  assert.equal(
    companies.reduce((sum, row) => sum + row.amount, 0),
    direct.summary.amount,
  );
  assert.ok(
    buildProjectDataRows(direct.rows, direct.filter).every((p) =>
      p.records.every((r) => selected.organizationNames!.includes(r.organization)),
    ),
  );
  assert.ok(
    buildEfficiencyTrendData(direct.rows, direct.filter).points.every((p) =>
      p.records.every((r) => selected.organizationNames!.includes(r.organization)),
    ),
  );
  if (group === '北部城市群') assert.equal(direct.filtered.length, 0);
}
direct.applyFilter(selectOrganizationFilter(direct.filter, '招商蛇口'));
assert.equal(direct.filter.organization, '');
assert.equal(direct.filter.organizationNames!.length, 0);
assert.ok(groupRows(direct.filtered, 'organization').length > 1);
// 项目页复用首页模块，但各模块和下钻均只统计当前项目。
direct.applyFilter(selectOrganizationFilter(direct.filter, '南部城市群'));
direct.setProjectScope('上海·招商苏河玺');
assert.equal(direct.filter.organization, '上海公司');
assert.equal(direct.filter.organizationLabel, '上海公司');
assert.ok(
  direct.filtered.length > 0 && direct.filtered.every((r) => r.project === '上海·招商苏河玺'),
);
for (const [periodType, periodAnchor] of [
  ['month', '2026-11'],
  ['quarter', '2026-Q4'],
  ['year', '2026'],
] as const) {
  direct.applyFilter(
    resolveStatisticsPeriod({ ...direct.filter, periodType, periodAnchor }, new Date(2026, 10, 3)),
  );
  const expected = filterRows(records, {
    ...direct.filter,
    organization: '',
    organizationNames: [],
    region: '',
    city: '',
    project: '上海·招商苏河玺',
  });
  assert.equal(direct.summary.amount, summarize(expected).amount);
  const projectRows = buildProjectDataRows(records, direct.filter);
  assert.equal(projectRows.length, 1);
  assert.equal(projectRows[0].name, '上海·招商苏河玺');
  assert.equal(projectRows[0].contracts, direct.summary.contracts);
  assert.ok(
    buildEfficiencyTrendData(records, direct.filter).points.every((p) =>
      p.records.every((r) => r.project === direct.projectScope),
    ),
  );
  assert.equal(
    buildKpiTrend({ key: 'contracts', mode: 'cumulative', filter: direct.filter, rows: records })
      .total,
    direct.summary.contracts,
  );
  direct.openKpiDetail('contracts', 'cumulative');
  assert.equal(direct.kpiDetailContext!.filter.project, direct.projectScope);
}
direct.applyFilter(defaultFilter());
assert.equal(direct.filter.project, '上海·招商苏河玺');
direct.setProjectScope('不存在的项目');
assert.equal(direct.filtered.length, 0);
direct.setProjectScope('');
assert.equal(direct.filter.organizationLabel, '南部城市群');
assert.ok(direct.filtered.every((r) => ['深圳公司', '广州公司'].includes(r.organization)));
// 从项目返回后再次进入城市，必须清除项目范围并恢复该城市的全部项目。
direct.setCityScope('深圳公司');
direct.setProjectScope('深圳·招商玺家园');
direct.setCityScope('上海公司');
direct.setProjectScope('');
assert.equal(direct.filter.project, '');
assert.equal(direct.filter.organization, '上海公司');
assert.equal(buildProjectDataRows(records, direct.filter).length, 2);
assert.ok(direct.filtered.every((r) => r.organization === '上海公司'));
direct.setCityScope('');
direct.setProjectScope('');
assert.equal(direct.filter.project, '');
assert.equal(direct.filter.organizationLabel, '南部城市群');
console.log(
  '通过：城市范围覆盖总部组织筛选、周期切换及重置不越界、卡片/渠道/项目清单/趋势/下钻同源、返回首页恢复原组织、直接进入与空城市。',
);
