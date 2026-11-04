import { computed } from 'vue';
import { useDashboardStore } from '../stores/dashboard';
import { fmt, summarize } from '../utils/metrics';
import { kpiDateRange, comparableDateRanges, selectKpiDateRows } from '../utils/kpiDaily';
import { comparisonChange } from '../utils/comparison';
import { calendarBounds, periodAnchor, statisticsPeriodPrefix } from '../utils/statisticsPeriod';
import type { KpiMetric } from '../types';
export function useDashboard() {
  const store = useDashboardStore();
  const kpis = computed<KpiMetric[]>(() => {
    const cumulative = kpiDateRange(store.filter, 'cumulative'),
      yesterday = kpiDateRange(store.filter, 'yesterday');
    const compare = comparableDateRanges(cumulative, store.filter);
    const cumulativeRows = selectKpiDateRows(store.rows, store.filter, cumulative);
    const s = summarize(cumulativeRows);
    const annual = summarize(
      selectKpiDateRows(store.rows, store.filter, {
        start: cumulative.end.slice(0, 4) + '-01-01',
        end: cumulative.end.slice(0, 4) + '-12-31',
        mode: 'cumulative',
      }),
    );
    const annualActual = summarize(
      selectKpiDateRows(store.rows, store.filter, {
        start: cumulative.end.slice(0, 4) + '-01-01',
        end: cumulative.end,
        mode: 'cumulative',
      }),
    );
    const type = store.filter.periodType;
    const calendarType = type && type !== 'custom' ? type : 'year';
    const goalRange = calendarBounds(calendarType, periodAnchor(calendarType, cumulative.end));
    const goalTarget =
      calendarType === 'year'
        ? annual
        : summarize(
            selectKpiDateRows(store.rows, store.filter, { ...goalRange, mode: 'cumulative' }),
          );
    const goalActual = type && type !== 'custom' ? s : annualActual;
    function targetProgress(key: 'subscriptionUnits' | 'contracts') {
      const subscription = key === 'subscriptionUnits';
      const actual = subscription ? goalActual.subscriptionUnits : goalActual.amount;
      const target = subscription ? goalTarget.subscriptionTargetUnits : goalTarget.target;
      const unit = subscription ? '套' : '万元';
      const title =
        type && type !== 'custom'
          ? `${statisticsPeriodPrefix(type)}${subscription ? '认购' : '签约'}目标达成率`
          : `${subscription ? '认购' : '签约'}年度目标达成率`;
      return {
        title,
        rate: target ? (actual / target) * 100 : null,
        actual,
        target,
        unit,
        note: `实际 ${fmt(actual, unit.includes('元') ? 2 : 0)} ${unit}（${goalRange.start} 至 ${cumulative.end}） / 目标 ${fmt(target, unit.includes('元') ? 2 : 0)} ${unit}（${goalRange.start} 至 ${goalRange.end}）`,
      };
    }
    const d = summarize(selectKpiDateRows(store.rows, store.filter, yesterday));
    const priorRows = selectKpiDateRows(store.rows, store.filter, compare.prior);
    const previousRows = selectKpiDateRows(store.rows, store.filter, compare.previous);
    const y = summarize(priorRows);
    const p = summarize(previousRows);
    return (
      [
        { key: 'leads', label: '线索数量', unit: '组', note: '线索按项目、渠道汇总' },
        { key: 'visitPeople', label: '到访人数', unit: '人', note: '独立模拟人数，非到访组数' },
        { key: 'subscriptionUnits', label: '认购套数', unit: '套', note: '认购房源套数口径' },
        {
          key: 'contracts',
          label: '签约套数',
          unit: '套',
          note: `累计签约金额 ${fmt(s.amount / 10000, 2)} 亿元`,
        },
      ] as const
    ).map((def) => ({
      ...def,
      value: fmt(s[def.key]),
      yesterday: fmt(d[def.key]),
      yesterdayDate: yesterday.end,
      cumulativeRange: `${cumulative.start} 至 ${cumulative.end}`,
      yoy:
        comparisonChange(
          cumulativeRows.length ? s[def.key] : null,
          priorRows.length ? y[def.key] : null,
        ) ?? NaN,
      mom:
        comparisonChange(
          cumulativeRows.length ? s[def.key] : null,
          previousRows.length ? p[def.key] : null,
        ) ?? NaN,
      progress:
        def.key === 'subscriptionUnits'
          ? annual.subscriptionTargetUnits
            ? (annualActual.subscriptionUnits / annual.subscriptionTargetUnits) * 100
            : 0
          : def.key === 'contracts' && annual.target
            ? (annualActual.amount / annual.target) * 100
            : 0,
      annualTarget:
        def.key === 'subscriptionUnits'
          ? annual.subscriptionTargetUnits
          : def.key === 'contracts'
            ? annual.target
            : undefined,
      annualActual:
        def.key === 'subscriptionUnits'
          ? annualActual.subscriptionUnits
          : def.key === 'contracts'
            ? annualActual.amount
            : undefined,
      annualTargetUnit: def.key === 'subscriptionUnits' ? '套' : '万元',
      annualGoalTitle:
        def.key === 'subscriptionUnits' ? '认购年度目标达成率' : '签约年度目标达成率',
      targetProgress:
        def.key === 'subscriptionUnits' || def.key === 'contracts'
          ? targetProgress(def.key)
          : undefined,
      annualConversionRate:
        def.key === 'visitPeople'
          ? annualActual.visitPeople
            ? (annualActual.subscriptionUnits / annualActual.visitPeople) * 100
            : null
          : undefined,
      annualConversionNote:
        def.key === 'visitPeople'
          ? `年初至结束日期：认购 ${fmt(annualActual.subscriptionUnits)} 套 / 到访 ${fmt(annualActual.visitPeople)} 人。按期间汇总比值展示，不代表同一批客户的队列转化率。`
          : undefined,
      conversionProgress:
        def.key === 'visitPeople'
          ? {
              title: `${type && type !== 'custom' ? statisticsPeriodPrefix(type) : '年度'}到访转认购率`,
              rate: goalActual.visitPeople
                ? (goalActual.subscriptionUnits / goalActual.visitPeople) * 100
                : null,
              note: `${goalRange.start} 至 ${cumulative.end}：认购 ${fmt(goalActual.subscriptionUnits)} 套 / 到访 ${fmt(goalActual.visitPeople)} 人。按期间汇总比值展示，不代表同一批客户的队列转化率。`,
            }
          : undefined,
      leadValidityRate:
        def.key === 'leads'
          ? s.leads && cumulativeRows.every((r) => r.validLeads !== undefined)
            ? (s.validLeads / s.leads) * 100
            : null
          : undefined,
      leadValidityNote:
        def.key === 'leads'
          ? `所选日期范围：有效线索 ${fmt(s.validLeads)} 组 / 线索总数 ${fmt(s.leads)} 组；有效状态为独立模拟数据。`
          : undefined,
      signedAmount: def.key === 'contracts' ? annualActual.amount : undefined,
    }));
  });
  return { store, kpis };
}
