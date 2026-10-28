import type { KpiKey, Summary, MarketingPerformanceMetric } from '../types';
import type {
  KpiDrillColumn,
  KpiDrillContext,
  KpiDrillRow,
  KpiDrillStep,
  KpiDrillView,
} from '../types/kpiDrilldown';
import { change, filterRows, fmt, previousPeriod, shiftPeriod, summarize } from './metrics';
export const kpiDefinitions: Record<KpiKey, { label: string; unit: string; formula: string }> = {
  amount: {
    label: '签约金额',
    unit: '万元',
    formula: '签约金额按所选期间的项目、渠道事实加总；各子项金额之和等于当前层金额。',
  },
  contracts: {
    label: '签约套数',
    unit: '套',
    formula: '签约套数按所选期间的项目、渠道事实加总；套均签约金额 = 签约金额 / 签约套数。',
  },
  collection: {
    label: '回款金额',
    unit: '万元',
    formula:
      '回款金额按所选期间的回款字段加总；签约回款比 = 同期回款金额 / 同期签约金额，不等同逐合同回款率。',
  },
  completion: {
    label: '销售目标完成率',
    unit: '%',
    formula:
      '当前层完成率 = 实际签约金额合计 / 销售目标金额合计 × 100%；子项完成率不直接相加或取平均。',
  },
};
const levels = [
  { field: 'project', label: '项目' },
  { field: 'channel', label: '渠道大类' },
  { field: 'channelObjectId', label: '供应商 / 平台' },
  { field: 'channelDetailId', label: '细分触点' },
] as const;
const ratio = (a: number, b: number, scale = 100) => (b ? (a / b) * scale : null);
const finite = (value: number) => (Number.isFinite(value) ? value : null);
export function kpiValue(s: Summary, key: KpiKey): number | null {
  return key === 'completion' ? (s.target ? (s.amount / s.target) * 100 : null) : s[key];
}
export function kpiRowValues(
  c: Summary,
  y: Summary,
  p: Summary,
  parent: Summary,
  key: KpiKey,
  hasPrior = true,
  hasPrevious = true,
): Record<string, number | null> {
  const value = kpiValue(c, key),
    prior = hasPrior ? kpiValue(y, key) : null,
    previous = hasPrevious ? kpiValue(p, key) : null;
  return {
    value,
    priorValue: prior,
    previousValue: previous,
    yoy: value !== null && prior !== null ? finite(change(value, prior)) : null,
    mom: value !== null && previous !== null ? finite(change(value, previous)) : null,
    contribution:
      key === 'completion'
        ? ratio(c.amount, parent.target)
        : ratio(value || 0, kpiValue(parent, key) || 0),
    amount: c.amount,
    contracts: c.contracts,
    collection: c.collection,
    target: c.target,
    avgPrice: ratio(c.amount, c.contracts, 1),
    subscriptions: c.subscriptions,
    collectionRatio: ratio(c.collection, c.amount),
    gap: Math.max(c.target - c.amount, 0),
    excess: Math.max(c.amount - c.target, 0),
    targetWeight: ratio(c.target, parent.target),
  };
}
export function kpiColumns(key: KpiKey): KpiDrillColumn[] {
  const definition = kpiDefinitions[key];
  const selected: KpiDrillColumn = {
    key: 'value',
    label: definition.label,
    unit: definition.unit,
    digits: key === 'completion' ? 1 : 0,
  };
  const related: Record<KpiKey, KpiDrillColumn[]> = {
    amount: [
      { key: 'contribution', label: '金额贡献占比', unit: '%', digits: 1 },
      { key: 'contracts', label: '签约套数', unit: '套' },
      { key: 'avgPrice', label: '套均签约金额', unit: '万元/套', digits: 1 },
    ],
    contracts: [
      { key: 'contribution', label: '套数贡献占比', unit: '%', digits: 1 },
      { key: 'amount', label: '签约金额', unit: '万元' },
      { key: 'avgPrice', label: '套均签约金额', unit: '万元/套', digits: 1 },
      { key: 'subscriptions', label: '认购量', unit: '组' },
    ],
    collection: [
      { key: 'contribution', label: '回款贡献占比', unit: '%', digits: 1 },
      { key: 'amount', label: '签约金额', unit: '万元' },
      { key: 'collectionRatio', label: '期间签约回款比', unit: '%', digits: 1 },
    ],
    completion: [
      { key: 'target', label: '销售目标金额', unit: '万元' },
      { key: 'amount', label: '实际签约金额', unit: '万元' },
      { key: 'gap', label: '未达目标差额', unit: '万元' },
      { key: 'excess', label: '超额金额', unit: '万元' },
      { key: 'targetWeight', label: '目标权重', unit: '%', digits: 1 },
      { key: 'contribution', label: '对上级完成率贡献', unit: '百分点', digits: 2 },
    ],
  };
  return [
    selected,
    ...related[key],
    {
      key: 'priorValue',
      label: '上年同期' + definition.label,
      unit: definition.unit,
      digits: selected.digits,
    },
    { key: 'yoy', label: '同比变化', unit: '%', digits: 1 },
    {
      key: 'previousValue',
      label: '上期' + definition.label,
      unit: definition.unit,
      digits: selected.digits,
    },
    { key: 'mom', label: '环比变化', unit: '%', digits: 1 },
  ];
}
export function formatKpiCell(value: number | null | undefined, column: KpiDrillColumn) {
  return value == null ? '—' : fmt(value, column.digits || 0);
}
export function buildKpiDrilldown(context: KpiDrillContext, path: KpiDrillStep[]): KpiDrillView {
  const { rows, filter, key } = context;
  const scope = (r: MarketingPerformanceMetric) => path.every((step) => r[step.field] === step.id);
  const priorPeriod = shiftPeriod(filter.period, -12),
    priorRange = previousPeriod(filter.period);
  const currentRecords = filterRows(rows, filter).filter(scope),
    priorRecords = filterRows(rows, filter, priorPeriod).filter(scope),
    previousRecords = filterRows(rows, filter, priorRange).filter(scope);
  const current = summarize(currentRecords),
    prior = summarize(priorRecords),
    previous = summarize(previousRecords),
    level = levels[path.length];
  const children: KpiDrillRow[] = [];
  if (level) {
    const partition = (records: MarketingPerformanceMetric[]) => {
      const groups = new Map<string, MarketingPerformanceMetric[]>();
      for (const row of records) {
        const id = row[level.field];
        const list = groups.get(id);
        if (list) list.push(row);
        else groups.set(id, [row]);
      }
      return groups;
    };
    const c = partition(currentRecords),
      y = partition(priorRecords),
      p = partition(previousRecords);
    for (const id of new Set([...c.keys(), ...y.keys(), ...p.keys()])) {
      const currentRows = c.get(id) || [],
        priorRows = y.get(id) || [],
        previousRows = p.get(id) || [],
        sample = currentRows[0] || priorRows[0] || previousRows[0];
      const name =
        level.field === 'channelObjectId'
          ? sample.channelObject
          : level.field === 'channelDetailId'
            ? sample.channelDetail
            : id;
      children.push({
        id,
        name,
        values: kpiRowValues(
          summarize(currentRows),
          summarize(priorRows),
          summarize(previousRows),
          current,
          key,
          !!priorRows.length,
          !!previousRows.length,
        ),
      });
    }
    children.sort(
      (a, b) => (b.values.value || 0) - (a.values.value || 0) || a.name.localeCompare(b.name),
    );
  }
  return {
    current,
    prior,
    previous,
    currentRecords,
    priorRecords,
    previousRecords,
    priorPeriod,
    previousPeriod: priorRange,
    children,
    level,
    totals: kpiRowValues(
      current,
      prior,
      previous,
      current,
      key,
      !!priorRecords.length,
      !!previousRecords.length,
    ),
  };
}
export function kpiSummaryCards(view: KpiDrillView, key: KpiKey) {
  const s = view.current,
    primary = kpiValue(s, key);
  const main = {
    label: kpiDefinitions[key].label,
    value:
      primary === null
        ? '—'
        : fmt(
            key === 'amount' || key === 'collection' ? primary / 10000 : primary,
            key === 'amount' || key === 'collection' ? 2 : key === 'completion' ? 1 : 0,
          ),
    unit: key === 'amount' || key === 'collection' ? '亿元' : kpiDefinitions[key].unit,
  };
  const money = (value: number) => fmt(value);
  const rate = (value: number | null) => (value === null ? '—' : fmt(value, 1));
  const related = {
    amount: [
      { label: '签约套数', value: money(s.contracts), unit: '套' },
      { label: '套均签约金额', value: rate(ratio(s.amount, s.contracts, 1)), unit: '万元/套' },
      { label: '销售目标完成率', value: rate(kpiValue(s, 'completion')), unit: '%' },
    ],
    contracts: [
      { label: '签约金额', value: money(s.amount), unit: '万元' },
      { label: '套均签约金额', value: rate(ratio(s.amount, s.contracts, 1)), unit: '万元/套' },
      {
        label: '上年同期签约套数',
        value: view.priorRecords.length ? money(view.prior.contracts) : '—',
        unit: '套',
      },
    ],
    collection: [
      { label: '同期签约金额', value: money(s.amount), unit: '万元' },
      { label: '期间签约回款比', value: rate(ratio(s.collection, s.amount)), unit: '%' },
      {
        label: '上年同期回款',
        value: view.priorRecords.length ? money(view.prior.collection) : '—',
        unit: '万元',
      },
    ],
    completion: [
      { label: '销售目标金额', value: money(s.target), unit: '万元' },
      { label: '实际签约金额', value: money(s.amount), unit: '万元' },
      { label: '未达目标差额', value: money(Math.max(s.target - s.amount, 0)), unit: '万元' },
    ],
  };
  return [main, ...related[key]];
}
export function kpiFactColumns(key: KpiKey): KpiDrillColumn[] {
  return kpiColumns(key).filter((c) =>
    [
      'value',
      'amount',
      'contracts',
      'avgPrice',
      'subscriptions',
      'collectionRatio',
      'target',
      'gap',
      'excess',
    ].includes(c.key),
  );
}
export function kpiFactValues(row: MarketingPerformanceMetric, key: KpiKey) {
  const s = summarize([row]);
  return kpiRowValues(s, s, s, s, key, false, false);
}
