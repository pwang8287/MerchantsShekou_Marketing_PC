import { sliceDateFacts } from './dateFacts';
import { calendarBounds, periodAnchor } from './statisticsPeriod';
import type {
  AggregateRow,
  DashboardFilter,
  Dimension,
  MarketingPerformanceMetric,
  MetricKey,
  MetricDefinition,
  Summary,
} from '../types';
export const dimensions: Record<Dimension, string> = {
  organization: '组织',
  region: '区域',
  city: '城市',
  project: '项目',
  channel: '渠道大类',
  channelObject: '供应商 / 平台',
  channelDetail: '细分触点',
  customer: '客户类型',
  period: '月份',
};
export const metricDefs: Record<MetricKey, MetricDefinition> = {
  target: { label: '目标金额', unit: '万元' },
  amount: { label: '签约金额', unit: '万元' },
  contracts: { label: '签约套数', unit: '套' },
  collection: { label: '回款金额', unit: '万元' },
  completion: { label: '目标完成率', unit: '%' },
  leads: { label: '线索量', unit: '组' },
  visits: { label: '到访量', unit: '组' },
  subscriptions: { label: '认购量', unit: '组' },
  conversion: { label: '签约转化率', unit: '%' },
  acquisition: { label: '签约获客成本', unit: '元/套', lowerBetter: true },
  roi: { label: '营销投入产出比', unit: '倍' },
};
export const divide = (a: number, b: number) => (b ? a / b : 0);
export const fmt = (n: number, digits = 0) =>
  n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export function summarize(rows: MarketingPerformanceMetric[]): Summary {
  const sums = rows.reduce(
    (a, r) => {
      a.amount += r.amount;
      a.collection += r.collection;
      a.target += r.target;
      a.leads += r.leads;
      a.validLeads += r.validLeads ?? 0;
      a.visits += r.visits;
      a.visitPeople += r.visitPeople ?? 0;
      a.subscriptionUnits += r.subscriptionUnits ?? 0;
      a.subscriptionTargetUnits += r.subscriptionTargetUnits ?? 0;
      a.subscriptions += r.subscriptions;
      a.contracts += r.contracts;
      a.fee += r.fee;
      return a;
    },
    {
      amount: 0,
      collection: 0,
      target: 0,
      leads: 0,
      validLeads: 0,
      visits: 0,
      visitPeople: 0,
      subscriptionUnits: 0,
      subscriptionTargetUnits: 0,
      subscriptions: 0,
      contracts: 0,
      fee: 0,
    },
  );
  return {
    ...sums,
    completion: divide(sums.amount, sums.target) * 100,
    conversion: divide(sums.contracts, sums.leads) * 100,
    acquisition: divide(sums.fee * 10000, sums.contracts),
    roi: divide(sums.amount, sums.fee),
  };
}
export function groupRows(
  rows: MarketingPerformanceMetric[],
  key: Dimension | 'property' | 'area' | 'advisor',
): AggregateRow[] {
  const groups = new Map<string, MarketingPerformanceMetric[]>();
  rows.forEach((r) => {
    const name = key === 'advisor' ? r.advisor || '未分配顾问' : r[key];
    const existing = groups.get(name);
    if (existing) existing.push(r);
    else groups.set(name, [r]);
  });
  return [...groups].map(([name, records]) => ({ name, records, ...summarize(records) }));
}
export function filterRows(
  rows: MarketingPerformanceMetric[],
  f: DashboardFilter,
  period = f.period,
  respectDateRange = true,
) {
  const matched = rows.filter(
    (r) =>
      r.period >= period[0] &&
      r.period <= period[1] &&
      (!f.organization || r.organization === f.organization) &&
      (!f.organizationNames?.length || f.organizationNames.includes(r.organization)) &&
      (!f.region || r.region === f.region) &&
      (!f.city || r.city === f.city) &&
      (!f.project || r.project === f.project) &&
      (!f.channel || r.channel === f.channel) &&
      (!f.channelObject || r.channelObjectId === f.channelObject) &&
      (!f.channelDetail || r.channelDetailId === f.channelDetail) &&
      (!f.customer || r.customer === f.customer),
  );
  const range = f.metricDateRange;
  if (
    !respectDateRange ||
    !range ||
    range[0].slice(0, 7) !== f.period[0] ||
    range[1].slice(0, 7) !== f.period[1]
  )
    return matched;
  const dateAt = (month: string, day: number) => {
    const [year, m] = month.split('-').map(Number);
    return `${month}-${String(Math.min(day, new Date(Date.UTC(year, m, 0)).getUTCDate())).padStart(2, '0')}`;
  };
  const sameSpan = (months: [string, string]) =>
    (Number(months[1].slice(0, 4)) - Number(months[0].slice(0, 4))) * 12 +
    Number(months[1].slice(5)) -
    Number(months[0].slice(5));
  const startDay = sameSpan(period) === sameSpan(f.period) ? Number(range[0].slice(8)) : 1;
  const lastDate = (month: string) => dateAt(month, 31);
  if (period[0] >= f.period[0] && period[1] <= f.period[1]) {
    const start = `${period[0]}-01` > range[0] ? `${period[0]}-01` : range[0];
    const end = lastDate(period[1]) < range[1] ? lastDate(period[1]) : range[1];
    return sliceDateFacts(matched, start, end);
  }
  const calendar =
    f.periodType && f.periodType !== 'custom'
      ? calendarBounds(f.periodType, periodAnchor(f.periodType, range[0]))
      : null;
  const wholeCalendar = calendar && calendar.start === range[0] && calendar.end === range[1];
  return sliceDateFacts(
    matched,
    dateAt(period[0], startDay),
    wholeCalendar ? lastDate(period[1]) : dateAt(period[1], Number(range[1].slice(8))),
  );
}
export function shiftPeriod(period: [string, string], months: number): [string, string] {
  const shift = (v: string) => {
    const [y, m] = v.split('-').map(Number);
    const d = new Date(y, m - 1 + months, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  return [shift(period[0]), shift(period[1])];
}
export function previousPeriod(period: [string, string]) {
  const [y1, m1] = period[0].split('-').map(Number);
  const [y2, m2] = period[1].split('-').map(Number);
  return shiftPeriod(period, -((y2 - y1) * 12 + m2 - m1 + 1));
}
export const change = (now: number, before: number) =>
  before ? ((now - before) / before) * 100 : NaN;
export const trendLabel = (n: number) =>
  Number.isFinite(n) ? `${n >= 0 ? '↑' : '↓'} ${fmt(Math.abs(n), 1)}%` : '— 无可比数据';
export function metricValue(row: Summary, key: MetricKey) {
  return row[key];
}
export function displayMetric(row: Summary, key: MetricKey) {
  return fmt(metricValue(row, key), metricDigits(key));
}
export function metricDigits(key: MetricKey) {
  return metricDefs[key].unit.includes('元')
    ? 2
    : ['completion', 'conversion', 'roi'].includes(key)
      ? 1
      : 0;
}
