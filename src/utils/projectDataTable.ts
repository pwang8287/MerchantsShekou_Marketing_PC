import type { AggregateRow, DashboardFilter, MarketingPerformanceMetric } from '../types';
import { filterRows, groupRows, summarize } from './metrics';
import { kpiDateRange, selectKpiDateRows } from './kpiDaily';
import { projectSalesStatus, type ProjectSalesStatus } from '../mocks/projectSalesStatus';
import { calendarBounds } from './statisticsPeriod';
export interface ProjectDataRow extends AggregateRow {
  salesStatus?: ProjectSalesStatus;
  annualAmount: number;
  annualTarget: number;
  annualCompletion: number | null;
  monthlyAmount?: number;
  monthlyTarget?: number;
  monthlyCompletion: number | null;
  visitConversion: number | null;
  feeRate: number | null;
  contractCost: number | null;
  visitCost: number | null;
  leadCost: number | null;
}
export function projectDataRates<
  T extends AggregateRow & {
    annualAmount: number;
    annualTarget: number;
    monthlyAmount?: number;
    monthlyTarget?: number;
  },
>(
  row: T,
): T &
  Pick<
    ProjectDataRow,
    | 'annualCompletion'
    | 'monthlyCompletion'
    | 'visitConversion'
    | 'feeRate'
    | 'contractCost'
    | 'visitCost'
    | 'leadCost'
  > {
  return {
    ...row,
    annualCompletion: row.annualTarget ? (row.annualAmount / row.annualTarget) * 100 : null,
    monthlyCompletion: row.monthlyTarget
      ? ((row.monthlyAmount ?? 0) / row.monthlyTarget) * 100
      : null,
    visitConversion: row.visitPeople ? (row.contracts / row.visitPeople) * 100 : null,
    feeRate: row.amount ? (row.fee / row.amount) * 100 : null,
    contractCost: row.contracts ? (row.fee * 10000) / row.contracts : null,
    visitCost: row.visits ? (row.fee * 10000) / row.visits : null,
    leadCost: row.leads ? (row.fee * 10000) / row.leads : null,
  };
}
export function buildProjectDataRows(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  dimension: 'project' | 'advisor' = 'project',
): ProjectDataRow[] {
  const end = kpiDateRange(filter, 'cumulative').end;
  const start = end.slice(0, 4) + '-01-01';
  const month = calendarBounds('month', end.slice(0, 7));
  const monthlyActual = new Map(
    groupRows(
      selectKpiDateRows(rows, filter, { start: month.start, end, mode: 'cumulative' }),
      dimension,
    ).map((row) => [row.name, row.amount]),
  );
  const monthlyTarget = new Map(
    groupRows(selectKpiDateRows(rows, filter, { ...month, mode: 'cumulative' }), dimension).map(
      (row) => [row.name, row.target],
    ),
  );
  const actual = new Map(
    groupRows(selectKpiDateRows(rows, filter, { start, end, mode: 'cumulative' }), dimension).map(
      (r) => [r.name, r.amount],
    ),
  );
  const target = new Map(
    groupRows(
      selectKpiDateRows(rows, filter, {
        start,
        end: end.slice(0, 4) + '-12-31',
        mode: 'cumulative',
      }),
      dimension,
    ).map((r) => [r.name, r.target]),
  );
  return groupRows(filterRows(rows, filter), dimension).map((row) =>
    projectDataRates({
      ...row,
      salesStatus: dimension === 'project' ? projectSalesStatus[row.name] : undefined,
      annualAmount: actual.get(row.name) ?? 0,
      annualTarget: target.get(row.name) ?? 0,
      monthlyAmount: monthlyActual.get(row.name) ?? 0,
      monthlyTarget: monthlyTarget.get(row.name) ?? 0,
    }),
  );
}
export function summarizeProjectData(rows: ProjectDataRow[]) {
  return projectDataRates({
    ...summarize(rows.flatMap((r) => r.records)),
    name: '合计',
    records: rows.flatMap((r) => r.records),
    annualAmount: rows.reduce((s, r) => s + r.annualAmount, 0),
    annualTarget: rows.reduce((s, r) => s + r.annualTarget, 0),
    monthlyAmount: rows.reduce((s, r) => s + (r.monthlyAmount ?? 0), 0),
    monthlyTarget: rows.reduce((s, r) => s + (r.monthlyTarget ?? 0), 0),
  });
}
export const projectDataColumns = [
  {
    key: 'annualCompletion',
    label: '年度签约达成率',
    unit: '%',
    digits: 2,
    width: 130,
    note: '结束日期所在年1月1日至结束日签约金额 ÷ 同年全年签约目标金额 × 100%。',
  },
  { key: 'amount', label: '签约金额', unit: '万元', digits: 2, width: 110 },
  { key: 'contracts', label: '签约套数', unit: '套', digits: 0, width: 80 },
  {
    key: 'visitConversion',
    label: '到访至签约转化率',
    unit: '%',
    digits: 2,
    width: 145,
    note: '所选周期签约套数 ÷ 到访人数 × 100%；为期间业务量比值，不代表同批客户追踪转化率。',
  },
  { key: 'subscriptionUnits', label: '认购套数', unit: '套', digits: 0, width: 80 },
  { key: 'visitPeople', label: '到访人数', unit: '人', digits: 0, width: 80 },
  { key: 'leads', label: '线索数量', unit: '组', digits: 0, width: 80 },
  {
    key: 'feeRate',
    label: '营销费率',
    unit: '%',
    digits: 2,
    width: 100,
    note: '所选周期营销费用 ÷ 签约金额 × 100%。',
  },
  {
    key: 'contractCost',
    label: '单套签约成本',
    unit: '元/套',
    digits: 2,
    width: 125,
    note: '所选周期营销费用（万元）× 10000 ÷ 签约套数。',
  },
  {
    key: 'visitCost',
    label: '单组到访成本',
    unit: '元/组',
    digits: 2,
    width: 120,
    note: '所选周期营销费用（万元）× 10000 ÷ 到访组数；与营销效率指标口径一致，零到访显示 -。',
  },
  {
    key: 'leadCost',
    label: '单条线索成本',
    unit: '元/组',
    digits: 2,
    width: 120,
    note: '所选周期营销费用（万元）× 10000 ÷ 线索数量；零线索显示 -。',
  },
] as const;
export type ProjectDataKey = (typeof projectDataColumns)[number]['key'] | 'monthlyCompletion';
export const monthlyCompletionColumn = {
  key: 'monthlyCompletion' as const,
  label: '月度签约达成率',
  unit: '%',
  digits: 2,
  width: 130,
  note: '所选月份月初至统计截止日签约金额 ÷ 该月完整签约目标金额 × 100%；目标为零时显示 -。',
};
