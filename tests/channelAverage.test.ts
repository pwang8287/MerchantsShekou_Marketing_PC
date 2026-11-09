import assert from 'node:assert/strict';
import { averageChannelValue, channelAverageRow } from '../src/utils/channelAverage';
import { groupRows, summarize } from '../src/utils/metrics';
import { records } from '../src/mocks/data';

const source = records.filter(
  (row) => row.project === records[0].project && row.period === records[0].period,
);
const groups = groupRows(source, 'channel');
const total = summarize(source);
const average = channelAverageRow(groups)!;
assert.equal(average.leads, total.leads / groups.length);
assert.equal(average.contracts, total.contracts / groups.length);
assert.equal(average.records.length, 0, 'reference rows must not enter business totals');
for (const [a, b] of [
  ['visitPeople', 'leads'],
  ['subscriptionUnits', 'visitPeople'],
  ['contracts', 'subscriptionUnits'],
  ['contracts', 'visitPeople'],
] as const) {
  assert.ok(
    Math.abs(average[a] / average[b] - total[a] / total[b]) < 1e-12,
    'conversion must use aggregate numerator/denominator',
  );
}
assert.equal(channelAverageRow([]), null);
assert.equal(
  averageChannelValue([10, 30, null], (v) => v),
  20,
);
assert.equal(
  averageChannelValue([null], (v) => v),
  null,
);
const online = groupRows(
  source.filter((r) => r.channel === '线上获客'),
  'channelObject',
);
assert.ok(online.find((r) => r.name === '其他')?.leads);
assert.equal(
  online.reduce((sum, r) => sum + r.leads, 0),
  summarize(source.filter((r) => r.channel === '线上获客')).leads,
);
console.log('通过：渠道平均值、总数转化率、空样本、缺失成本和线上其他渠道对账。');
