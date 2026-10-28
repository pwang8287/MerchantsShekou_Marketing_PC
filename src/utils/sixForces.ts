import type { MarketingPerformanceMetric } from '../types';
import { groupRows } from './metrics';
import { projectForceBaselines } from '../mocks/sixForces';

export const forceDefinitions = [
  {
    id: 'research',
    name: '客户研究力',
    max: 15,
    score: 10.5,
    metrics: ['来访客户有效率', '客户信息完整度'],
    description: '关注客户研究的深度与信息沉淀，提升客群识别和需求洞察能力。',
  },
  {
    id: 'strategy',
    name: '项目策略力',
    max: 20,
    score: 20,
    metrics: ['整体来访率', '自然来访成交占比', '非成交复访率', '整体费率'],
    description: '结合来访结构、成交效率与费用表现，检查项目营销策略的执行质量。',
  },
  {
    id: 'online',
    name: '线上拓客力',
    max: 10,
    score: 7,
    metrics: ['线上获客占比', '线上来访占比', '线上成交占比', '新媒体获客占比', '投放费率'],
    description: '追踪线上获客、到访与成交的衔接，识别平台与内容经营的提升空间。',
  },
  {
    id: 'offline',
    name: '线下拓客力',
    max: 20,
    score: 6,
    metrics: [
      '分销成交占比',
      '自渠自拓成交占比',
      '全民营销成交占比',
      '员工推荐成交占比',
      '招商置业成交占比',
    ],
    description: '评估分销、自拓和推荐渠道的协同，改善渠道结构与自主获客能力。',
  },
  {
    id: 'conversion',
    name: '案场转化力',
    max: 25,
    score: 25,
    metrics: ['转化率', '平均接待时长', '成交周期', '首访成交比例', '复访率'],
    description: '围绕现场接待、持续跟进与成交周期，诊断客户从到访到签约的转化效率。',
  },
  {
    id: 'community',
    name: '社群服务力',
    max: 10,
    score: 3,
    metrics: [
      '老带新成交占比',
      '客户满意度',
      '老带新推荐量',
      '老带新推荐到访量',
      '老带新推荐访占比',
    ],
    description: '关注业主口碑、客户服务与推荐链路，提升社群经营和老客户转介绍表现。',
  },
];
export const healthStatus = (ratio: number) =>
  ratio >= 0.85 ? '优秀' : ratio >= 0.6 ? '关注' : '预警';
export const healthClass = (status: string) =>
  status === '优秀' ? 'excellent' : status === '关注' ? 'attention' : 'warning';
const hash = (text: string) => [...text].reduce((v, c) => (v * 31 + c.charCodeAt(0)) % 100003, 7);
const round = (v: number) => Math.round(v * 10) / 10;
export function buildSixForceProjects(records: MarketingPerformanceMetric[]) {
  const projects = groupRows(records, 'project').map((group) => {
    const sample = group.records[0];
    const baseline = projectForceBaselines[group.name] ?? [0.92, 0.73, 0.45][hash(group.name) % 3];
    const months = [...new Set(group.records.map((r) => r.period))].sort();
    const forces = forceDefinitions.map((d, i) => {
      const rows = d.metrics.map((name, j) => {
        const seed = hash(`${group.name}:${i}:${j}`);
        const target = name.includes('费率')
          ? 3
          : name.includes('时长')
            ? 45
            : name.includes('周期')
              ? 30
              : name.includes('推荐量') || name.includes('到访量')
                ? 100
                : [70, 80, 65, 30, 40][j];
        const lower = name.includes('费率') || name.includes('周期');
        const max = d.max / d.metrics.length;
        const attainment =
          months.reduce(
            (sum, month) =>
              sum +
              Math.max(
                0.15,
                Math.min(
                  1.16,
                  baseline +
                    ((hash(`${group.name}:force:${i}`) % 17) - 8) / 100 +
                    ((seed % 9) - 4) / 100 +
                    ((hash(group.name + month + i) % 9) - 4) / 200,
                ),
              ),
            0,
          ) / months.length;
        const actual = round(target * (lower ? 2 - attainment : attainment));
        // 健康度、能力分及总分都由同一指标达成率计算。
        const achieved = lower ? 2 - actual / target : actual / target;
        const score = round(Math.min(1, Math.max(0, achieved)) * max);
        return {
          name,
          target,
          actual,
          lower,
          max,
          score,
          status: healthStatus(achieved),
          unit: name.includes('时长')
            ? '分钟'
            : name.includes('周期')
              ? '天'
              : name.includes('推荐量') || name.includes('到访量')
                ? '组'
                : '%',
          rank: 0,
        };
      });
      const score = round(rows.reduce((sum, r) => sum + r.score, 0));
      return {
        ...d,
        rows,
        score,
        ratio: score / d.max,
        status: healthStatus(score / d.max),
        rank: 0,
      };
    });
    const total = round(forces.reduce((sum, f) => sum + f.score, 0));
    return {
      name: group.name,
      organization: sample.organization,
      region: sample.region,
      city: sample.city,
      forces,
      total,
      status: healthStatus(total / 100),
      warningCount: forces.filter((f) => f.status === '预警').length,
      rank: 0,
    };
  });
  projects.forEach((p) => {
    p.rank = 1 + projects.filter((x) => x.total > p.total).length;
    p.forces.forEach((force, i) => {
      force.rank = 1 + projects.filter((x) => x.forces[i].score > force.score).length;
      force.rows.forEach((row, j) => {
        row.rank = 1 + projects.filter((x) => x.forces[i].rows[j].score > row.score).length;
      });
    });
  });
  return projects.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
export type SixForceProject = ReturnType<typeof buildSixForceProjects>[number];
// 空集合由页面展示空态；偶数样本取中间两项的算术平均。
export function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
export function summarizeSixForces(projects: SixForceProject[]) {
  const count = projects.length;
  return {
    count,
    total: median(projects.map((p) => p.total)),
    excellent: projects.filter((p) => p.status === '优秀').length,
    warning: projects.filter((p) => p.warningCount > 0).length,
    forces: forceDefinitions.map((d, i) => ({
      ...d,
      score: median(projects.map((p) => p.forces[i].score)),
      warnings: projects.filter((p) => p.forces[i].status === '预警').length,
    })),
  };
}
