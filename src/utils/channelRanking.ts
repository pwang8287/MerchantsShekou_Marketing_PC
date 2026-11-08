import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import organizationTree from '../mocks/organizationTree.json';
import { groupRows } from './metrics';
export type ChannelRankingDimension = 'group' | 'organization' | 'project';
export type ChannelRankingMetric = 'leads' | 'visitPeople' | 'subscriptionUnits' | 'contracts';
export const channelRankingMetrics = {
  leads: { name: '线索数量', unit: '组' },
  visitPeople: { name: '到访人数', unit: '人' },
  subscriptionUnits: { name: '认购套数', unit: '套' },
  contracts: { name: '签约套数', unit: '套' },
};
export function channelRankingDimensions(
  filter: DashboardFilter,
  cityScope = '',
): ChannelRankingDimension[] {
  if (cityScope || filter.organization || filter.city) return ['project'];
  if (
    filter.organizationNames?.length ||
    organizationTree.children.some((group) => group.name === filter.organizationLabel) ||
    filter.region
  )
    return ['organization', 'project'];
  return ['group', 'organization', 'project'];
}
export function channelRankingRows(
  rows: MarketingPerformanceMetric[],
  dimension: ChannelRankingDimension,
  metric: ChannelRankingMetric,
) {
  const groups =
    dimension === 'group'
      ? groupRows(
          rows.map((row) => ({
            ...row,
            region:
              organizationTree.children.find((group) => group.children.includes(row.organization))
                ?.name || row.region,
          })),
          'region',
        )
      : groupRows(rows, dimension);
  return groups
    .map((row) => ({ name: row.name, value: row[metric] }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'zh-CN'));
}
