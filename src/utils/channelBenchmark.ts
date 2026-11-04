import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import { filterRows } from './metrics';

export function nationalChannelRows(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  channel: string,
) {
  return filterRows(rows, {
    ...filter,
    organization: '',
    organizationNames: [],
    organizationLabel: '',
    region: '',
    city: '',
    project: '',
    channel,
  });
}
