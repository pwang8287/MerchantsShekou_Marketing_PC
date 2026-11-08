import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import { filterRows } from './metrics';
import { channelRankingDimensions, type ChannelRankingMetric } from './channelRanking';
import organizationTree from '../mocks/organizationTree.json';
export interface OrganizationContributionNode {
  id: string;
  name: string;
  value: number;
  share: number | null;
  channels: Record<string, number>;
  children?: OrganizationContributionNode[];
}
export function organizationContribution(
  rows: MarketingPerformanceMetric[],
  filter: DashboardFilter,
  metric: ChannelRankingMetric,
  cityScope = '',
) {
  const matched = filterRows(rows, filter);
  const total = matched.reduce((sum, row) => sum + (row[metric] ?? 0), 0);
  const dimensions = channelRankingDimensions(filter, cityScope);
  const build = (
    facts: MarketingPerformanceMetric[],
    level: number,
    parent: string,
  ): OrganizationContributionNode[] => {
    const groups = new Map<string, MarketingPerformanceMetric[]>();
    for (const row of facts) {
      const name =
        dimensions[level] === 'group'
          ? organizationTree.children.find((group) => group.children.includes(row.organization))
              ?.name || row.region
          : dimensions[level] === 'organization'
            ? row.organization
            : row.project;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(row);
    }
    return [...groups]
      .map(([name, records]) => {
        const id = JSON.stringify([parent, name]);
        const value = records.reduce((sum, row) => sum + (row[metric] ?? 0), 0);
        const channels: Record<string, number> = {};
        for (const row of records)
          channels[row.channel] = (channels[row.channel] || 0) + (row[metric] ?? 0);
        return {
          id,
          name,
          value,
          share: total ? (value / total) * 100 : null,
          channels,
          ...(level + 1 < dimensions.length ? { children: build(records, level + 1, id) } : {}),
        };
      })
      .sort((a, b) => b.value - a.value);
  };
  return { total, nodes: build(matched, 0, '') };
}
