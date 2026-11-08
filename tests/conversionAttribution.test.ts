import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import {
  conversionAttribution,
  type AttributionDimension,
} from '../src/utils/conversionAttribution';
import { filterRows, summarize } from '../src/utils/metrics';
import type { DashboardFilter } from '../src/types';
const filter: DashboardFilter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
  periodType: 'month',
  periodAnchor: '2026-11',
  period: ['2026-11', '2026-11'],
  metricDateRange: ['2026-11-01', '2026-11-06'],
};
for (const period of [
  filter,
  {
    ...filter,
    periodType: 'year' as const,
    periodAnchor: '2026',
    period: ['2026-01', '2026-11'] as [string, string],
    metricDateRange: ['2026-01-01', '2026-11-06'] as [string, string],
  },
  {
    ...filter,
    periodType: 'custom' as const,
    period: ['2026-09', '2026-11'] as [string, string],
    metricDateRange: ['2026-09-20', '2026-11-06'] as [string, string],
  },
]) {
  for (const dimension of [
    'channel',
    'group',
    'organization',
    'project',
  ] as AttributionDimension[]) {
    for (const key of ['leads', 'visitPeople', 'subscriptionUnits', 'contracts'] as const) {
      const result = conversionAttribution(records, period, key, dimension);
      assert.equal(result.current, summarize(filterRows(records, period))[key]);
      assert.equal(
        result.items.reduce((sum, item) => sum + item.current, 0),
        result.current,
      );
      assert.equal(
        result.items.reduce((sum, item) => sum + item.previous, 0),
        result.previous,
      );
      assert.equal(
        result.items.reduce((sum, item) => sum + item.delta, 0),
        result.delta,
      );
    }
  }
}
const monthly = conversionAttribution(records, filter, 'visitPeople', 'channel');
assert.equal(
  monthly.previous,
  summarize(
    filterRows(records, {
      ...filter,
      period: ['2026-10', '2026-10'],
      metricDateRange: ['2026-10-01', '2026-10-06'],
    }),
  ).visitPeople,
);
const empty = conversionAttribution([], filter, 'contracts', 'project');
const yearlyComparison = conversionAttribution(records, filter, 'visitPeople', 'channel', 'yoy');
assert.equal(
  yearlyComparison.previous,
  summarize(
    filterRows(records, {
      ...filter,
      period: ['2025-11', '2025-11'],
      metricDateRange: ['2025-11-01', '2025-11-06'],
    }),
  ).visitPeople,
);
assert.equal(yearlyComparison.current, monthly.current);
assert.equal(
  yearlyComparison.items.reduce((sum, item) => sum + item.delta, 0),
  yearlyComparison.delta,
);
assert.equal(empty.rate, null);
assert.equal(empty.delta, 0);
assert.equal(empty.items.length, 0);
console.log('通过：转化归因四环节、四维度贡献加总守恒、月/年/自定义统计范围、上月同期及零基数。');
