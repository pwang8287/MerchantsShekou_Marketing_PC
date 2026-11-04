import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import { summarize } from '../src/utils/metrics';
import { kpiDateRange, selectKpiDateRows, comparableDateRanges } from '../src/utils/kpiDaily';
import type { DashboardFilter } from '../src/types';
const filter:DashboardFilter={organization:'',region:'',city:'',project:'',channel:'',customer:'',basis:'签约口径',period:['2026-01','2026-10'],metricDate:'2026-10-30'};
assert.equal(kpiDateRange(filter,'yesterday').end,'2026-10-29');
assert.deepEqual(kpiDateRange(filter,'cumulative'),{start:'2026-01-01',end:'2026-10-30',mode:'cumulative'});
assert.equal(kpiDateRange({...filter,metricDate:'2026-01-01'},'yesterday').end,'2025-12-31');
assert.equal(comparableDateRanges({start:'2024-02-29',end:'2024-02-29',mode:'yesterday'}).prior.end,'2023-02-28');
const source=records.filter((r)=>r.period==='2026-10').slice(0,6);
const fields=['leads','validLeads','visitPeople','subscriptionUnits','subscriptionTargetUnits','contracts','amount','collection','target','fee'] as const;
const total=summarize(source);
const daily=Array.from({length:31},(_,i)=>summarize(selectKpiDateRows(source,filter,{start:`2026-10-${String(i+1).padStart(2,'0')}`,end:`2026-10-${String(i+1).padStart(2,'0')}`,mode:'yesterday'})));
for (const field of fields) assert.ok(Math.abs(daily.reduce((s,r)=>s+r[field],0)-total[field])<1e-8,field+' daily/monthly reconciliation');
const last=selectKpiDateRows(source,filter,{start:'2026-10-31',end:'2026-10-31',mode:'yesterday'});
const partial=summarize(selectKpiDateRows(source,filter,{start:'2026-10-01',end:'2026-10-30',mode:'cumulative'}));
for(const field of fields)assert.ok(Math.abs(partial[field]+summarize(last)[field]-total[field])<1e-8);
assert.ok(records.every((r)=>Number.isInteger(r.visitPeople)&&Number.isInteger(r.subscriptionUnits)));
assert.ok(records.some((r)=>r.visitPeople!==r.visits));
assert.deepEqual(selectKpiDateRows([],filter,kpiDateRange(filter,'yesterday')),[]);
console.log('通过：日度模拟月总量守恒、昨日跨月跨年、闰年比较、累计截止日、人数及套数独立字段。');

for(let day=1;day<=31;day++) {
  const d=`2026-10-${String(day).padStart(2,'0')}`;
  assert.ok(selectKpiDateRows(source,filter,{start:d,end:d,mode:'yesterday'}).every((r)=>r.validLeads!>=0&&r.validLeads!<=r.leads));
}
console.log('通过：日度有效线索数不超过当天线索总数，且按月加总守恒。');
