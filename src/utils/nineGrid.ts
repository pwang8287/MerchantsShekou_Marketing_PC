import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import type {
  ChannelLevel,
  CompareMode,
  GridCell,
  GridResult,
  GridThresholds,
  NineGridKind,
} from '../types/nineGrid';
import { change, divide, filterRows, previousPeriod, shiftPeriod, summarize } from './metrics';
export function gridCells(kind: NineGridKind): GridCell[] {
  const advisor = kind === 'advisor';
  const names = advisor
    ? [
        ['缩量提效', '稳量提效', '增量提效'],
        ['缩量稳效', '量效平稳', '增量稳效'],
        ['缩量降效', '稳量降效', '增量降效'],
      ]
    : [
        ['缩量增本', '稳量增本', '增量增本'],
        ['缩量稳本', '量本平稳', '增量稳本'],
        ['缩量降本', '稳量降本', '增量降本'],
      ];
  const advice = advisor
    ? [
        [
          '转化改善但签约量下降，检查线索和接待量。',
          '梳理接待与跟进方法，验证效率改善能否持续。',
          '研究转化方法，同时核对线索质量与可售货源。',
        ],
        [
          '检查线索分配与接待机会是否减少。',
          '持续观察客群、接待质量与成交周期。',
          '签约增长且转化稳定，关注接待承载能力。',
        ],
        [
          '优先检查到访质量、跟进节奏与流失原因。',
          '接待投入增加但转化走弱，拆解认购及签约环节。',
          '增长伴随转化下降，核对新增线索质量与顾问负荷。',
        ],
      ]
    : [
        [
          '优先排查投放费用、线索质量和转化流失。',
          '检查获客单价、佣金及费用结构变化。',
          '结合折扣、佣金、回款判断新增成交是否值得增加投入。',
        ],
        [
          '检查线索供给、客户流失和项目去化阻力。',
          '持续观察目标完成和渠道结构。',
          '提炼可复制的获客方式，并验证回款质量。',
        ],
        [
          '判断是主动收缩低效投入，还是业务规模萎缩。',
          '识别节费经验，确认没有透支后续线索供给。',
          '研究增长来源，验证增量与降本是否可以持续。',
        ],
      ];
  return names.flatMap((row, ri) =>
    row.map((name, col) => ({
      id: `${ri}-${col}`,
      name,
      row: ri,
      col,
      tone:
        ((advisor ? ri === 0 : ri === 2) && col >= 1) || (ri === 1 && col === 2)
          ? 'good'
          : (col === 0 && ri !== (advisor ? 0 : 2)) ||
              (!advisor && ri === 0 && col === 1) ||
              (advisor && ri === 2)
            ? 'risk'
            : 'neutral',
      advice: advice[ri][col],
    })),
  );
}
export function locateCell(
  x: number,
  y: number,
  xThreshold: number,
  yThreshold: number,
  kind: NineGridKind,
) {
  const col = x < -xThreshold ? 0 : x > xThreshold ? 2 : 1;
  const row = y > yThreshold ? 0 : y < -yThreshold ? 2 : 1;
  return gridCells(kind).find((c) => c.row === row && c.col === col)!;
}
export function buildNineGrid(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  kind: NineGridKind,
  mode: CompareMode,
  thresholds: GridThresholds,
  channelLevel: ChannelLevel = 'category',
): GridResult {
  const baseline = mode === 'yoy' ? shiftPeriod(filter.period, -12) : previousPeriod(filter.period);
  const currentRows = filterRows(rows, filter),
    previousRows = filterRows(rows, filter, baseline);
  const key = (r: MarketingPerformanceMetric) =>
    kind === 'advisor'
      ? r.advisorId || ''
      : kind === 'project'
        ? r.project
        : channelLevel === 'object'
          ? r.channelObjectId
          : channelLevel === 'detail'
            ? r.channelDetailId
            : r.channel;
  const ids = [...new Set([...currentRows, ...previousRows].map(key).filter(Boolean))];
  const result: GridResult = {
    points: [],
    excluded: [],
    cells: gridCells(kind),
    previousPeriod: baseline,
    total: ids.length,
  };
  ids.forEach((id) => {
    const currentRecords = currentRows.filter((r) => key(r) === id),
      priorRecords = previousRows.filter((r) => key(r) === id),
      sample = currentRecords[0] || priorRecords[0];
    const name =
      kind === 'advisor'
        ? `${sample.advisor} · ${sample.project}`
        : kind === 'channel'
          ? [
              sample.channel,
              ...(channelLevel !== 'category' ? [sample.channelObject] : []),
              ...(channelLevel === 'detail' ? [sample.channelDetail] : []),
            ].join(' / ')
          : id;
    const group =
      kind === 'channel' ? sample.channel : kind === 'project' ? sample.region : sample.project;
    const c = summarize(currentRecords),
      p = summarize(priorRecords);
    let reason = '';
    if (!priorRecords.length) reason = '无比较期间数据';
    else if (!currentRecords.length) reason = '本期无数据';
    else if (!p.contracts) reason = '比较期签约量为零';
    else if (c.contracts < thresholds.minContracts || p.contracts < thresholds.minContracts)
      reason = `任一期间签约少于${thresholds.minContracts}套`;
    else if (kind === 'advisor' && (!c.visits || !p.visits)) reason = '到访量为零';
    else if (kind !== 'advisor' && (!p.acquisition || !c.contracts))
      reason = '获客成本缺少有效基数';
    if (reason) {
      result.excluded.push({ name, reason, group });
      return;
    }
    const x = change(c.contracts, p.contracts);
    const y =
      kind === 'advisor'
        ? (divide(c.contracts, c.visits) - divide(p.contracts, p.visits)) * 100
        : change(c.acquisition, p.acquisition);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      result.excluded.push({ name, reason: '指标不可计算', group });
      return;
    }
    result.points.push({
      name,
      group,
      x,
      y,
      cell: locateCell(
        x,
        y,
        thresholds.x,
        kind === 'advisor' ? thresholds.conversion : thresholds.cost,
        kind,
      ),
      current: c,
      previous: p,
      records: currentRecords,
    });
  });
  return result;
}

// 图例筛选仅影响渠道视图，保留同比基数、不可比对象与原始事实，避免改变其它看板。
export function filterGridByChannel(result: GridResult, channel: string): GridResult {
  if (!channel) return result;
  const points = result.points.filter((p) => p.group === channel),
    excluded = result.excluded.filter((p) => p.group === channel);
  return { ...result, points, excluded, total: points.length + excluded.length };
}
