import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import { splitAdvisorRecords } from '../mocks/advisors';
import { filterRows, groupRows } from './metrics';
import { kpiDateRange, selectKpiDateRows } from './kpiDaily';
import { projectDataRates, type ProjectDataRow } from './projectDataTable';

// 先按日期截取事实再分配顾问，确保任意自定义日期下的合计与项目指标一致。
export function buildAdvisorDataRows(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
): ProjectDataRow[] {
  const names = [...new Set(rows.map((row) => row.project))].sort();
  const hasAdvisors = rows.some((row) => row.advisorId || row.advisor);
  const split = (selected: MarketingPerformanceMetric[]) =>
    hasAdvisors ? selected : splitAdvisorRecords(selected, names);
  const end = kpiDateRange(filter, 'cumulative').end;
  const start = end.slice(0, 4) + '-01-01';
  const actual = new Map(
    groupRows(
      split(selectKpiDateRows(rows, filter, { start, end, mode: 'cumulative' })),
      'advisor',
    ).map((row) => [row.name, row.amount]),
  );
  const target = new Map(
    groupRows(
      split(
        selectKpiDateRows(rows, filter, {
          start,
          end: end.slice(0, 4) + '-12-31',
          mode: 'cumulative',
        }),
      ),
      'advisor',
    ).map((row) => [row.name, row.target]),
  );
  return groupRows(split(filterRows(rows, filter)), 'advisor').map((row) =>
    projectDataRates({
      ...row,
      annualAmount: actual.get(row.name) || 0,
      annualTarget: target.get(row.name) || 0,
    }),
  );
}
