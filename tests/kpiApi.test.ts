import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { records } from '../src/mocks/data';
import { mapRecord } from '../src/api/dashboard';
import { useDashboardStore, defaultFilter } from '../src/stores/dashboard';
import { useDashboard } from '../src/composables/useDashboard';
import { summarize } from '../src/utils/metrics';
import { selectKpiDateRows } from '../src/utils/kpiDaily';
export async function run() {
  setActivePinia(createPinia());
  const store=useDashboardStore();
  await store.load();
  assert.equal(store.error,'');
  const loaded=summarize(store.rows), raw=summarize(records);
  for(const field of ['validLeads','visitPeople','subscriptionUnits','subscriptionTargetUnits'] as const) assert.equal(loaded[field],raw[field],'API mapping must preserve '+field);
  assert.equal(mapRecord({...records[0],visitPeople:undefined}).visitPeople,undefined,'missing API people data must not be relabeled visits');
  store.filter={...defaultFilter(),metricDate:'2026-10-30',metricDateRange:['2026-10-01','2026-10-30'],period:['2026-10','2026-10']};
  const {kpis}=useDashboard();
  const validity=summarize(store.filtered);
  assert.equal(kpis.value.find((k)=>k.key==='leads')!.leadValidityRate,validity.validLeads/validity.leads*100);
  assert.ok(records.every((r)=>Number.isInteger(r.validLeads)&&r.validLeads!>=0&&r.validLeads!<=r.leads));
  for(const key of ['visitPeople','subscriptionUnits']) {
    const card=kpis.value.find((k)=>k.key===key)!;
    assert.ok(Number(card.value.replaceAll(',',''))>0);
    assert.ok(Number(card.yesterday.replaceAll(',',''))>0);
  }
  const card=kpis.value.find((k)=>k.key==='subscriptionUnits')!;
  const annual=summarize(selectKpiDateRows(store.rows,store.filter,{start:'2026-01-01',end:'2026-12-31',mode:'cumulative'}));
  const actual=summarize(selectKpiDateRows(store.rows,store.filter,{start:'2026-01-01',end:'2026-10-30',mode:'cumulative'}));
  assert.equal(kpis.value.find((k)=>k.key==='visitPeople')!.annualConversionRate,actual.subscriptionUnits/actual.visitPeople*100);
  const annualRate=kpis.value.find((k)=>k.key==='visitPeople')!.annualConversionRate;
  assert.equal(card.annualTarget,annual.subscriptionTargetUnits);
  assert.equal(card.annualActual,actual.subscriptionUnits);
  assert.equal(card.progress,actual.subscriptionUnits/annual.subscriptionTargetUnits*100);
  const progress=card.progress;
  store.filter.metricDateRange=['2026-10-15','2026-10-30'];
  assert.equal(kpis.value.find((k)=>k.key==='subscriptionUnits')!.progress,progress);
  assert.equal(kpis.value.find((k)=>k.key==='visitPeople')!.annualConversionRate,annualRate);
  store.rows=store.rows.map((r)=>({...r,subscriptionTargetUnits:0}));
  assert.equal(kpis.value.find((k)=>k.key==='subscriptionUnits')!.progress,0);
  assert.equal(kpis.value.find((k)=>k.key==='subscriptionUnits')!.annualTarget,0);
  store.rows=store.rows.map((r)=>({...r,visitPeople:0}));
  assert.equal(kpis.value.find((k)=>k.key==='visitPeople')!.annualConversionRate,null);
  store.rows=store.rows.map((r)=>({...r,leads:0,validLeads:0}));
  assert.equal(kpis.value.find((k)=>k.key==='leads')!.leadValidityRate,null);
  console.log('通过：线索有效率按所选日期范围计算、有效线索不超过总量、API字段保留与零基数保护。');
  console.log('通过：年度到访转认购率使用认购套数/到访人数、独立于筛选开始日、零到访人数显示无基数。');
  console.log('通过：真实模拟API加载后保留人数/套数字段、昨日及累计非零、认购年度目标对账与零目标保护。');
}
