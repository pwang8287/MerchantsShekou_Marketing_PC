import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { records } from '../src/mocks/data';
import { useDashboardStore, defaultFilter } from '../src/stores/dashboard';
import { useDashboard } from '../src/composables/useDashboard';
import {
  buildKpiDrilldown,
  kpiColumns,
  kpiValue,
  kpiSummaryCards,
  kpiFactColumns,
  kpiDefinitions,
} from '../src/utils/kpiDrilldown';
import { kpiDateRange, selectKpiDateRows } from '../src/utils/kpiDaily';
import { fmt, summarize } from '../src/utils/metrics';
import type { KpiKey, MarketingPerformanceMetric } from '../src/types';
import type { KpiDrillContext, KpiDrillStep } from '../src/types/kpiDrilldown';
setActivePinia(createPinia());
const store = useDashboardStore();
store.rows = records;
store.filter = defaultFilter();
const { kpis } = useDashboard();
for (const key of ['amount', 'contracts', 'collection', 'completion'] as KpiKey[]) {
  store.openKpiDetail(key);
  assert.equal(store.kpiDetailVisible, true);
  assert.equal(store.kpiDetailContext!.key, key);
  const context = store.kpiDetailContext!;
  let path: KpiDrillStep[] = [];
  const root = buildKpiDrilldown(context, path);
  assert.equal(root.totals.value, kpiValue(store.summary, key));
  assert.equal(
    kpiSummaryCards(root, key)[0].value,
    fmt(kpiValue(root.current, key)! / (key === 'amount' || key === 'collection' ? 10000 : 1), key === 'amount' || key === 'collection' ? 2 : key === 'completion' ? 1 : 0),
    'drawer and selected card must reconcile',
  );
  const columns = kpiColumns(key);
  assert.equal(columns[0].label, kpiDefinitions[key].label);
  assert.ok(kpiFactColumns(key).some((c) => c.key === 'value'));
  for (let depth = 0; depth < 4; depth++) {
    const view = buildKpiDrilldown(context, path);
    assert.ok(view.level);
    if (key === 'completion') {
      assert.ok(
        Math.abs(
          view.children.reduce((n, row) => n + (row.values.contribution || 0), 0) -
            (view.totals.value || 0),
        ) < 1e-8,
        'weighted percentage-point contributions must reconcile',
      );
      assert.equal(
        view.children.reduce((n, row) => n + (row.values.target || 0), 0),
        view.current.target,
      );
      assert.equal(
        view.children.reduce((n, row) => n + (row.values.amount || 0), 0),
        view.current.amount,
      );
    } else {
      assert.ok(
        Math.abs(
          view.children.reduce((n, row) => n + (row.values.value || 0), 0) -
            (view.totals.value || 0),
        ) < 1e-8,
        'children must add up to parent selected metric',
      );
      assert.ok(
        Math.abs(view.children.reduce((n, row) => n + (row.values.contribution || 0), 0) - 100) <
          1e-8,
      );
    }
    assert.ok(
      view.currentRecords.every((row) => path.every((step) => row[step.field] === step.id)),
    );
    const chosen = view.children.find((row) => (row.values.value || 0) > 0)!;
    assert.ok(chosen);
    path = [...path, { field: view.level!.field, id: chosen.id, label: chosen.name }];
  }
  const leaf = buildKpiDrilldown(context, path);
  assert.equal(leaf.level, undefined);
  assert.ok(leaf.currentRecords.length > 0);
  assert.equal(leaf.current.amount, summarize(leaf.currentRecords).amount);
  const parent = buildKpiDrilldown(context, path.slice(0, -1));
  assert.ok(parent.children.some((row) => row.id === path[path.length - 1].id));
}
store.openKpiDetail('collection');
const frozen = store.kpiDetailContext!;
const previous = JSON.stringify(frozen.filter),
  amount = buildKpiDrilldown(frozen, []).totals.value;
store.filter.region = '华南区域';
store.filter.period = ['2025-01', '2025-03'];
assert.equal(
  JSON.stringify(frozen.filter),
  previous,
  'open drawer must preserve card filter snapshot',
);
assert.equal(buildKpiDrilldown(frozen, []).totals.value, amount);
store.drill('图表明细', []);
assert.equal(store.kpiDetailVisible, false);
assert.equal(store.drawer, true);
store.openKpiDetail('amount');
assert.equal(store.drawer, false);
assert.equal(store.kpiDetailVisible, true);
const row = (
  id: string,
  project: string,
  target: number,
  amount: number,
): MarketingPerformanceMetric => ({
  ...records[0],
  id,
  project,
  period: '2026-01',
  target,
  amount,
  contracts: amount ? 1 : 0,
  collection: amount / 2,
});
const context: KpiDrillContext = {
  key: 'completion',
  filter: { ...defaultFilter(), period: ['2026-01', '2026-01'] },
  rows: [row('a', 'A项目', 10, 10), row('b', 'B项目', 90, 0)],
};
const weighted = buildKpiDrilldown(context, []);
assert.equal(weighted.totals.value, 10);
assert.equal(weighted.children.reduce((a, r) => a + (r.values.value || 0), 0) / 2, 50);
assert.equal(
  weighted.children.reduce((a, r) => a + (r.values.contribution || 0), 0),
  10,
);
assert.equal(weighted.totals.priorValue, null);
assert.equal(weighted.totals.yoy, null);
const noTarget = buildKpiDrilldown({ ...context, rows: [row('c', '无目标项目', 0, 10)] }, []);
assert.equal(noTarget.totals.value, null);
assert.equal(noTarget.children[0].values.value, null);
assert.equal(kpiSummaryCards(noTarget, 'completion')[0].value, '—');
store.rows = [row('c', '无目标项目', 0, 10)];
store.filter = context.filter;
assert.equal(kpiValue(store.summary, 'completion'), null);
assert.equal(kpiValue(summarize(context.rows), 'collection'), 5);
assert.equal(
  fmt(buildKpiDrilldown({ ...context, key: 'amount' }, []).totals.value! / 10000, 2),
  '0.00',
);
console.log('通过：四指标卡对应下钻、四层级逐级对账、完成率加权、零目标、比较基数和筛选快照。');
// 同一个指标在组合筛选下仍须与卡片一致，且不能混入其它渠道事实。
store.rows = records;
store.filter = {
  ...defaultFilter(),
  region: '华南区域',
  city: '深圳',
  channel: '线上获客',
  channelObject: 'online-wechat',
  channelDetail: 'online-wechat-0',
  customer: '改善客群',
};
for (const key of ['amount', 'contracts', 'collection', 'completion'] as KpiKey[]) {
  store.openKpiDetail(key);
  const selected = buildKpiDrilldown(store.kpiDetailContext!, []);
  assert.equal(selected.totals.value, kpiValue(store.summary, key));
  assert.ok(selected.currentRecords.length > 0);
  assert.ok(
    selected.currentRecords.every(
      (r) =>
        r.city === '深圳' &&
        r.channel === '线上获客' &&
        r.channelDetailId === 'online-wechat-0' &&
        r.customer === '改善客群',
    ),
  );
}

store.rows = records;
store.filter = { ...defaultFilter(), metricDate: '2026-10-30', period: ['2026-01', '2026-10'] };
assert.deepEqual(kpis.value.map((k)=>k.label), ['线索数量','到访人数','认购套数','签约套数']);
for (const card of kpis.value) {
  for (const mode of ['yesterday','cumulative'] as const) {
    store.openKpiDetail(card.key,mode);
    const detail=buildKpiDrilldown(store.kpiDetailContext!,[]);
    assert.equal(kpiSummaryCards(detail,card.key)[0].value,mode==='yesterday'?card.yesterday:card.value);
    assert.equal(detail.totals.value,kpiValue(summarize(selectKpiDateRows(records,store.filter,kpiDateRange(store.filter,mode))),card.key));
    assert.equal(detail.children.reduce((sum,r)=>sum+(r.values.value||0),0),detail.totals.value);
    assert.ok(detail.currentRecords.every((r)=>!!r.rangeLabel));
  }
}
const southFilter = { ...store.filter, organizationNames: ['深圳公司','广州公司'], organizationLabel:'南部城市群' };
const south = selectKpiDateRows(records,southFilter,kpiDateRange(southFilter,'cumulative'));
assert.ok(south.length>0 && south.every((r)=>southFilter.organizationNames.includes(r.organization)));
console.log('通过：线索、人数、认购套数、签约套数四卡昨日/累计与明细逐级对账，城市群筛选。');

const contractCard=kpis.value.find((k)=>k.key==='contracts')!;
const annualTarget=summarize(selectKpiDateRows(records,store.filter,{start:'2026-01-01',end:'2026-12-31',mode:'cumulative'})).target;
assert.equal(contractCard.annualTarget,annualTarget);
assert.ok(Math.abs(contractCard.progress-(contractCard.signedAmount! / annualTarget*100))<1e-8);
store.rows=records.map((r)=>({...r,target:0}));
assert.equal(kpis.value.find((k)=>k.key==='contracts')!.progress,0);
assert.equal(kpis.value.find((k)=>k.key==='contracts')!.annualTarget,0);
console.log('通过：年度签约达成率使用全年金额目标，随筛选计算，零目标不产生无穷值。');

// 起止日期默认遵循运行机器本地日历，并且重置时重新计算。
const machine = new Date();
const today = `${machine.getFullYear()}-${String(machine.getMonth()+1).padStart(2,'0')}-${String(machine.getDate()).padStart(2,'0')}`;
assert.deepEqual(defaultFilter().metricDateRange,[today.slice(0,7)+'-01',today]);
store.rows=records;
store.filter={...defaultFilter(),metricDate:'2026-10-20',metricDateRange:['2026-10-10','2026-10-20'],period:['2026-10','2026-10']};
const ranged=kpiDateRange(store.filter,'cumulative');
assert.deepEqual(ranged,{start:'2026-10-10',end:'2026-10-20',mode:'cumulative'});
const rangeSummary=summarize(selectKpiDateRows(records,store.filter,ranged));
assert.equal(store.summary.amount,rangeSummary.amount);
assert.equal(store.summary.contracts,rangeSummary.contracts);
const annualProgress=kpis.value.find((k)=>k.key==='contracts')!.progress;
const periodContracts=kpis.value.find((k)=>k.key==='contracts')!.value;
store.filter.metricDateRange=['2026-10-01','2026-10-20'];
assert.equal(kpis.value.find((k)=>k.key==='contracts')!.progress,annualProgress,'annual progress independent of selected start date');
assert.notEqual(kpis.value.find((k)=>k.key==='contracts')!.value,periodContracts);
assert.equal(kpiDateRange({...store.filter,metricDateRange:['2026-10-01','2026-10-01']},'yesterday').end,'2026-09-30');
console.log('通过：默认机器本月1日至当天、起止日期逐日过滤、区间累计与年度进度分离及跨月昨日。');
