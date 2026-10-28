import { computed } from 'vue';
import { useDashboardStore } from '../stores/dashboard';
import { change, filterRows, fmt, previousPeriod, shiftPeriod, summarize } from '../utils/metrics';
import type { KpiMetric } from '../types';
export function useDashboard() {
  const store = useDashboardStore();
  const kpis = computed<KpiMetric[]>(() => {
    const s = store.summary,
      y = summarize(filterRows(store.rows, store.filter, shiftPeriod(store.filter.period, -12))),
      p = summarize(filterRows(store.rows, store.filter, previousPeriod(store.filter.period)));
    return [
      {
        key: 'amount',
        label: '签约金额',
        value: fmt(s.amount / 10000, 2),
        unit: '亿元',
        yoy: change(s.amount, y.amount),
        mom: change(s.amount, p.amount),
        progress: s.completion,
        note: `目标 ${fmt(s.target / 10000, 2)} 亿元`,
      },
      {
        key: 'contracts',
        label: '签约套数',
        value: fmt(s.contracts),
        unit: '套',
        yoy: change(s.contracts, y.contracts),
        mom: change(s.contracts, p.contracts),
        progress: s.conversion,
        note: `线索转签约率 ${fmt(s.conversion, 1)}%`,
      },
      {
        key: 'collection',
        label: '回款金额',
        value: fmt(s.collection / 10000, 2),
        unit: '亿元',
        yoy: change(s.collection, y.collection),
        mom: change(s.collection, p.collection),
        progress: s.amount ? (s.collection / s.amount) * 100 : 0,
        note: `签约回款比 ${fmt(s.amount ? (s.collection / s.amount) * 100 : 0, 1)}%`,
      },
      {
        key: 'completion',
        label: '销售目标完成率',
        value: s.target ? fmt(s.completion, 1) : '—',
        unit: '%',
        yoy: s.target && y.target ? change(s.completion, y.completion) : NaN,
        mom: s.target && p.target ? change(s.completion, p.completion) : NaN,
        progress: s.completion,
        note: s.target
          ? `目标差额 ${fmt(Math.max(s.target - s.amount, 0) / 10000, 2)} 亿元`
          : '未设置销售目标',
      },
    ];
  });
  return { store, kpis };
}
