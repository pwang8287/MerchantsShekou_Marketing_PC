import type { MarketingPerformanceMetric } from '../types';
import { allocateInteger } from '../mocks/allocation';
import { groupRows } from './metrics';
import organizationTree from '../mocks/organizationTree.json';

export const propertyTypes = ['住宅', '商业', '公寓', '写字楼', '车位', '配套及其他'];
export const areaBands = ['<40㎡', '40–90㎡', '90–140㎡', '140–180㎡', '>180㎡'];
export type PropertyMetric = 'available' | 'subscriptionUnits' | 'contracts';
export interface PropertyDistributionCell {
  project: string;
  organization: string;
  group: string;
  property: string;
  area: string;
  available: number;
  subscriptionUnits: number;
  contracts: number;
}
const areaWeights = [
  [1, 24, 45, 21, 9],
  [18, 34, 26, 14, 8],
  [25, 55, 15, 4, 1],
  [8, 22, 36, 21, 13],
  [100, 0, 0, 0, 0],
  [36, 26, 20, 12, 6],
];
function hash(value: string) {
  return [...value].reduce((result, char) => (result * 31 + char.charCodeAt(0)) >>> 0, 7);
}
// 现有事实表缺少业态及面积段库存，按项目生成稳定的演示分布。
// 认购、签约由当前筛选事实总数分配，逐层合计保持一致；可售取期末库存快照，不能跨月累加。
export function buildPropertyDistribution(
  rows: MarketingPerformanceMetric[],
  snapshotMonth: string,
): PropertyDistributionCell[] {
  return groupRows(rows, 'project').flatMap((project) => {
    const source = project.records[0];
    const seed = hash(project.name);
    const weights = [54 + (seed % 9), 9 + (seed % 5), 8 + (seed % 7), 8, 15, 2];
    const availableTotal = 900 + (seed % 1600) + (hash(project.name + snapshotMonth) % 260);
    const totals = {
      available: allocateInteger(availableTotal, weights),
      subscriptionUnits: allocateInteger(project.subscriptionUnits, weights),
      contracts: allocateInteger(project.contracts, weights),
    };
    return propertyTypes.flatMap((property, index) => {
      const distribution = Object.fromEntries(
        (Object.keys(totals) as PropertyMetric[]).map((key) => [
          key,
          allocateInteger(totals[key][index], areaWeights[index]),
        ]),
      ) as Record<PropertyMetric, number[]>;
      return areaBands.map((area, areaIndex) => ({
        project: project.name,
        organization: source.organization,
        group:
          organizationTree.children.find((group) => group.children.includes(source.organization))
            ?.name || source.region,
        property,
        area,
        available: distribution.available[areaIndex],
        subscriptionUnits: distribution.subscriptionUnits[areaIndex],
        contracts: distribution.contracts[areaIndex],
      }));
    });
  });
}
export function sumPropertyDistribution(
  cells: PropertyDistributionCell[],
  dimension: 'property' | 'area' | 'group' | 'organization' | 'project',
  metric: PropertyMetric,
) {
  const grouped = new Map<string, number>();
  for (const cell of cells)
    grouped.set(cell[dimension], (grouped.get(cell[dimension]) || 0) + cell[metric]);
  return [...grouped].map(([name, value]) => ({ name, value }));
}
