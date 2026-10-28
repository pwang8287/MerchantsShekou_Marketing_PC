import type { MarketingPerformanceMetric } from '../types';
import { simulatedDealCycle } from './dealCycle';
import { groupRows } from './metrics';
import { buildSixForceProjects } from './sixForces';
import { scoreDistribution } from './scoreDistribution';

export function buildProjectScoreBubbles(rows: MarketingPerformanceMetric[]) {
  const scores = new Map(buildSixForceProjects(rows).map((p) => [p.name, p]));
  return groupRows(rows, 'project').map((r) => {
    const p = scores.get(r.name)!;
    return {
      name: r.name,
      city: p.city,
      score: p.total,
      status: p.status,
      conversion: r.leads ? (r.contracts / r.leads) * 100 : null,
      dealCycle: simulatedDealCycle(r.records),
      contracts: r.contracts,
      leads: r.leads,
      visits: r.visits,
    };
  });
}

export function projectScoreGrid(points: ReturnType<typeof buildProjectScoreBubbles>) {
  const available = points.filter((p) => p.conversion !== null);
  const values = available.map((p) => p.conversion!).sort((a, b) => a - b);
  const distribution = scoreDistribution(values);
  const max = Math.max(10, Math.ceil(Math.max(0, ...values) * 1.2));
  const q1 = distribution?.q1 ?? 0,
    q3 = distribution?.q3 ?? 0;
  const fallback = q1 <= 0 || q1 >= q3;
  const low = fallback ? max / 3 : q1,
    high = fallback ? (max * 2) / 3 : q3;
  const cells = ['优秀', '关注', '预警'].flatMap((status, row) =>
    ['低转化', '中转化', '高转化'].map((conversion, col) => ({
      id: `${row}-${col}`,
      name: `${status}·${conversion}`,
      row,
      col,
      tone: row === 0 ? 'good' : row === 2 ? 'risk' : 'neutral',
      advice:
        row === 2
          ? '优先检查项目六力短板，结合渠道结构、案场跟进及客户质量分析原因。'
          : col === 0
            ? '当前转化率位于相对低位，建议结合线索质量及渠道环节漏斗定位提升空间。'
            : row === 0
              ? '能力得分表现优秀，结合项目阶段和线索结构评估可复用的营销做法。'
              : '持续跟踪项目能力短板和转化效率，结合明细确定后续改进动作。',
    })),
  );
  return {
    max,
    low,
    high,
    fallback,
    cells,
    points: available.map((p) => {
      const row = p.score >= 85 ? 0 : p.score >= 60 ? 1 : 2;
      const col = p.conversion! < low ? 0 : p.conversion! < high ? 1 : 2;
      return { ...p, cell: cells.find((c) => c.row === row && c.col === col)! };
    }),
  };
}

// 将每个数值区间投影到等宽显示区间，保留区间内部的数值比例。
export function projectScoreCoordinate(value: number, boundaries: number[]) {
  const last = boundaries.length - 1;
  if (value <= boundaries[0]) return 0;
  if (value >= boundaries[last]) return last;
  const index = boundaries.findIndex((edge, i) => i < last && value < boundaries[i + 1]);
  return index + (value - boundaries[index]) / (boundaries[index + 1] - boundaries[index]);
}
