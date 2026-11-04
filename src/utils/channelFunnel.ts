import type { MarketingPerformanceMetric } from '../types';
import { summarize } from './metrics';

export function buildChannelFunnel(rows: MarketingPerformanceMetric[], channel: string) {
  const records = rows.filter((r) => r.channel === channel);
  const totals = summarize(records);
  const values = [
    { name: '线索', value: totals.leads, unit: '组' },
    { name: '到访', value: totals.visitPeople, unit: '人' },
    { name: '认购', value: totals.subscriptionUnits, unit: '套' },
    { name: '签约', value: totals.contracts, unit: '套' },
  ];
  return values.map((item, i) => {
    const previous = i ? values[i - 1].value : 0;
    return {
      ...item,
      rate: i && previous ? (item.value / previous) * 100 : null,
      lost: i ? previous - item.value : null,
      cumulative: values[0].value ? (item.value / values[0].value) * 100 : null,
    };
  });
}
