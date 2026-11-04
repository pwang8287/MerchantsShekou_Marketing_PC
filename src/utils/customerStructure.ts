import type { MarketingPerformanceMetric } from '../types';
import { allocateInteger } from '../mocks/allocation';
import { projectFloorPlans } from '../mocks/projectFloorPlans';
import { groupRows } from './metrics';

export interface CustomerStructureRow {
  name: string;
  visits: number;
  subscriptions: number;
  contracts: number;
  visitShare: number | null;
  conversion: number | null;
}

// 在上一环节数量约束内分配整数，确保户型加总与项目汇总对账。
function allocateWithin(total: number, weights: number[], capacities: number[]) {
  const values = capacities.map(() => 0);
  let remaining = Math.min(
    total,
    capacities.reduce((sum, value) => sum + value, 0),
  );
  while (remaining > 0) {
    const active = capacities
      .map((capacity, index) => ({ capacity, index }))
      .filter(({ capacity, index }) => capacity > values[index]);
    const proposed = allocateInteger(
      remaining,
      active.map(({ index }) => weights[index]),
    );
    active.forEach(({ capacity, index }, i) => {
      const count = Math.min(proposed[i], capacity - values[index]);
      values[index] += count;
      remaining -= count;
    });
  }
  return values;
}

export function buildCustomerStructure(
  records: MarketingPerformanceMetric[],
): CustomerStructureRow[] {
  const groups = new Map<string, CustomerStructureRow>();
  for (const project of groupRows(records, 'project')) {
    const plans = projectFloorPlans[project.name] || ['2室1厅80㎡', '3室2厅110㎡', '4室2厅140㎡'];
    const weights = plans.map((_, index) => [22, 38, 28, 12][index]);
    const visits = allocateInteger(project.visitPeople, weights);
    const subscriptions = allocateWithin(project.subscriptionUnits, [18, 43, 30, 9], visits);
    const contracts = allocateWithin(project.contracts, [15, 45, 32, 8], subscriptions);
    plans.forEach((name, index) => {
      const row = groups.get(name) || {
        name,
        visits: 0,
        subscriptions: 0,
        contracts: 0,
        visitShare: null,
        conversion: null,
      };
      row.visits += visits[index];
      row.subscriptions += subscriptions[index];
      row.contracts += contracts[index];
      groups.set(name, row);
    });
  }
  const totalVisits = [...groups.values()].reduce((sum, row) => sum + row.visits, 0);
  return [...groups.values()].map((row) => ({
    ...row,
    visitShare: totalVisits ? (row.visits / totalVisits) * 100 : null,
    conversion: row.visits ? (row.contracts / row.visits) * 100 : null,
  }));
}
