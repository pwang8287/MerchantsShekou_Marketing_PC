import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import type { GridCell, GridResult } from '../types/nineGrid';
import { filterRows, groupRows, summarize } from './metrics';
import { simulatedDealCycle } from './dealCycle';

function boundaries(values: number[], percent = false) {
  const ordered = [...values].sort((a, b) => a - b);
  const max = Math.max(percent ? 1 : 0.1, ...ordered) * 1.15;
  const upper = percent ? Math.min(100, Math.ceil(max)) : Math.ceil(max * 10) / 10;
  let low = ordered[Math.floor((ordered.length - 1) / 3)] ?? upper / 3;
  let high = ordered[Math.floor(((ordered.length - 1) * 2) / 3)] ?? (upper * 2) / 3;
  if (low <= 0 || high <= low || high >= upper) {
    low = upper / 3;
    high = (upper * 2) / 3;
  }
  return [0, low, high, upper];
}
export function buildAdvisorReceptionMatrix(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  dimension: 'advisor' | 'project' = 'advisor',
) {
  const start = filter.metricDateRange?.[0] || filter.period[0] + '-01';
  const end =
    filter.metricDateRange?.[1] ||
    filter.metricDate ||
    `${filter.period[1]}-${new Date(Date.UTC(Number(filter.period[1].slice(0, 4)), Number(filter.period[1].slice(5)), 0)).getUTCDate()}`;
  const days = Math.max(
    1,
    Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) + 1,
  );
  const groups = groupRows(filterRows(rows, filter), dimension);
  const valid = groups.filter((row) => row.visitPeople > 0);
  const xEdges = boundaries(
    valid.map((row) => (row.contracts / row.visitPeople) * 100),
    true,
  );
  const yEdges = boundaries(valid.map((row) => row.visitPeople / days));
  const cells: GridCell[] = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++)
      cells.push({
        id: `${row}-${col}`,
        row,
        col,
        name: `${['高', '中', '低'][row]}量${['低', '中', '高'][col]}转化`,
        tone: col === 2 ? 'good' : col === 0 ? 'risk' : 'neutral',
        advice: '',
      });
  const result: GridResult = {
    points: valid.map((row) => {
      const x = (row.contracts / row.visitPeople) * 100,
        y = row.visitPeople / days;
      const col = x < xEdges[1] ? 0 : x > xEdges[2] ? 2 : 1;
      const band = y < yEdges[1] ? 0 : y > yEdges[2] ? 2 : 1;
      return {
        name: dimension === 'project' ? row.name : row.name + ' · ' + row.records[0].project,
        group: row.records[0].project,
        x,
        y,
        cell: cells[(2 - band) * 3 + col],
        current: row,
        previous: summarize([]),
        records: row.records,
        dealCycle: simulatedDealCycle(row.records),
      };
    }),
    excluded: groups
      .filter((row) => !row.visitPeople)
      .map((row) => ({
        name: row.name,
        group: row.records[0].project,
        reason: '接待人数为零，无法计算转化率',
      })),
    cells,
    previousPeriod: filter.period,
    total: groups.length,
  };
  return { ...result, xEdges, yEdges, days };
}

// 月度回放以筛选截止月为 T，历史月取完整自然月，末月截至筛选截止日。
export function buildReceptionHistory(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  dimension: 'advisor' | 'project',
  count: number,
) {
  const cutoff =
    filter.metricDateRange?.[1] ||
    filter.metricDate ||
    `${filter.period[1]}-${new Date(Date.UTC(Number(filter.period[1].slice(0, 4)), Number(filter.period[1].slice(5)), 0)).getUTCDate()}`;
  const anchor = new Date(cutoff + 'T00:00:00Z');
  const frames = Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - count + index + 1, 1),
    );
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const start = month + '-01';
    const end =
      index === count - 1
        ? cutoff
        : `${month}-${new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()}`;
    return {
      month,
      start,
      end,
      result: buildAdvisorReceptionMatrix(
        rows,
        {
          ...filter,
          period: [month, month],
          periodType: 'month',
          periodAnchor: month,
          metricDateRange: [start, end],
          metricDate: end,
        },
        dimension,
      ),
    };
  });
  // 固定整段回放的刻度和分区，保证轨迹移动来自指标变化。
  const points = frames.flatMap((frame) => frame.result.points);
  const xEdges = boundaries(
    points.map((point) => point.x),
    true,
  );
  const yEdges = boundaries(points.map((point) => point.y));
  frames.forEach((frame) => {
    frame.result.xEdges = xEdges;
    frame.result.yEdges = yEdges;
    frame.result.points.forEach((point) => {
      const col = point.x < xEdges[1] ? 0 : point.x > xEdges[2] ? 2 : 1;
      const band = point.y < yEdges[1] ? 0 : point.y > yEdges[2] ? 2 : 1;
      point.cell = frame.result.cells[(2 - band) * 3 + col];
    });
  });
  return frames;
}
