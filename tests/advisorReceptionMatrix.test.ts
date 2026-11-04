import { matrixReplayPoints } from '../src/utils/matrixReplay';
import assert from 'node:assert/strict';
import { records } from '../src/mocks/data';
import { splitAdvisorRecords } from '../src/mocks/advisors';
import {
  buildAdvisorReceptionMatrix,
  buildReceptionHistory,
} from '../src/utils/advisorReceptionMatrix';
import { filterRows, summarize } from '../src/utils/metrics';
import type { DashboardFilter } from '../src/types';
const rows = splitAdvisorRecords(records);
for (const range of [
  ['2026-11-01', '2026-11-04'],
  ['2026-10-28', '2026-11-03'],
  ['2025-01-01', '2025-01-31'],
] as [string, string][]) {
  const filter: DashboardFilter = {
    organization: '',
    region: '',
    city: '',
    project: '',
    channel: '',
    customer: '',
    basis: '签约口径',
    periodType: 'custom',
    period: [range[0].slice(0, 7), range[1].slice(0, 7)],
    metricDateRange: range,
  };
  const result = buildAdvisorReceptionMatrix(rows, filter);
  assert.equal(result.days, (Date.parse(range[1]) - Date.parse(range[0])) / 86400000 + 1);
  const sum = summarize(filterRows(rows, filter));
  assert.equal(
    result.points.reduce((value, point) => value + point.current.visitPeople, 0),
    sum.visitPeople,
  );
  for (const point of result.points) {
    assert.equal(point.x, (point.current.contracts / point.current.visitPeople) * 100);
    assert.equal(point.y, point.current.visitPeople / result.days);
    assert.ok(result.cells.includes(point.cell));
  }
  for (const edges of [result.xEdges, result.yEdges])
    assert.ok(edges.every((edge, i) => !i || edge > edges[i - 1]));
  assert.equal(buildAdvisorReceptionMatrix([], filter).points.length, 0);
}
console.log('通过：顾问当期转化率、日均接待自然日分母、跨月与无历史基数、汇总对账及空数据。');

const historyFilter: DashboardFilter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
  periodType: 'month',
  period: ['2026-11', '2026-11'],
  metricDateRange: ['2026-11-01', '2026-11-04'],
};
for (const count of [3, 6, 12]) {
  for (const dimension of ['advisor', 'project'] as const) {
    const history = buildReceptionHistory(rows, historyFilter, dimension, count);
    assert.equal(history.length, count);
    assert.equal(history[count - 1].month, '2026-11');
    assert.equal(history[count - 1].end, '2026-11-04');
    assert.equal(history[count - 1].result.days, 4);
    assert.equal(history[count - 2].end, '2026-10-31');
    assert.equal(history[count - 2].result.days, 31);
    history.forEach((frame) => {
      assert.deepEqual(frame.result.xEdges, history[0].result.xEdges);
      assert.deepEqual(frame.result.yEdges, history[0].result.yEdges);
      for (const point of frame.result.points) {
        assert.equal(point.y, point.current.visitPeople / frame.result.days);
        assert.ok(point.x >= frame.result.xEdges[0] && point.x <= frame.result.xEdges[3]);
        assert.ok(point.y >= frame.result.yEdges[0] && point.y <= frame.result.yEdges[3]);
      }
    });
  }
}
const early = buildReceptionHistory(
  rows,
  {
    ...historyFilter,
    period: ['2025-01', '2025-01'],
    metricDateRange: ['2025-01-01', '2025-01-05'],
  },
  'advisor',
  6,
);
assert.equal(early[0].month, '2024-08');
assert.equal(early[0].result.points.length, 0);
assert.ok(early[5].result.points.length > 0);
console.log('通过：项目/顾问3、6、12个月回放、跨年、末月截断、固定坐标分区和缺失月份。');

const playback = buildReceptionHistory(rows, historyFilter, 'advisor', 6);
const snapshot = playback[5].result.points;
const chosen = snapshot[0];
for (const frame of playback) {
  const display = matrixReplayPoints(snapshot, frame.result.points, chosen.name);
  const moving = frame.result.points.find((point) => point.name === chosen.name);
  assert.equal(
    display.find((point) => point.name === chosen.name),
    moving,
  );
  for (const background of snapshot.filter((point) => point.name !== chosen.name)) {
    assert.equal(
      display.find((point) => point.name === background.name),
      background,
    );
  }
}
const missing = matrixReplayPoints(snapshot, [], chosen.name);
assert.ok(!missing.some((point) => point.name === chosen.name));
assert.equal(missing.length, snapshot.length - 1);
console.log('通过：回放仅替换选中气泡，其他气泡位置、大小数据保持末月快照，缺失月份不虚构移动点。');
