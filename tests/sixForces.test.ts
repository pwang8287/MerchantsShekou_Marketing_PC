import assert from 'node:assert/strict';
import { buildProjectScoreBubbles, projectScoreGrid, projectScoreCoordinate } from '../src/utils/projectScoreBubble';
import { scoreDistribution } from '../src/utils/scoreDistribution';
import { buildSixForceProjects, summarizeSixForces, healthStatus, median } from '../src/utils/sixForces';
import { records } from '../src/mocks/data';
const current = records.filter((r) => r.period >= '2026-01' && r.period <= '2026-09');
const projects = buildSixForceProjects(current);
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
assert.equal(projects.length, 8);
for (const p of projects) {
  close(p.total, p.forces.reduce((s, f) => s + f.score, 0));
  assert.equal(p.rank, 1 + projects.filter((x) => x.total > p.total).length);
  assert.equal(p.status, healthStatus(p.total / 100));
  assert.equal(p.warningCount, p.forces.filter((f) => f.status === '预警').length);
  p.forces.forEach((f, i) => {
    close(f.score, f.rows.reduce((s, r) => s + r.score, 0));
    assert.ok(f.score >= 0 && f.score <= f.max);
    assert.equal(f.rank, 1 + projects.filter((x) => x.forces[i].score > f.score).length);
    for (const row of f.rows) assert.ok(row.score >= 0 && row.score <= row.max);
  });
  const alone = buildSixForceProjects(current.filter((r) => r.project === p.name))[0];
  close(alone.total, p.total);
  assert.deepEqual(alone.forces.map((f) => f.score), p.forces.map((f) => f.score), 'project scores stay identical across overview and detail');
}
assert.equal(median([]), 0);
assert.equal(median([9]), 9);
assert.equal(median([1, 2, 100]), 2);
assert.equal(median([1, 3, 5, 100]), 4);
const input = [7, 1, 4];
assert.equal(median(input), 4);
assert.deepEqual(input, [7, 1, 4]);
for (const selected of [projects, projects.slice(0, 3), ...[...new Set(projects.map((p) => p.region))].map((region) => projects.filter((p) => p.region === region)), ...[...new Set(projects.map((p) => p.city))].map((city) => projects.filter((p) => p.city === city))]) {
  const result = summarizeSixForces(selected);
  close(result.total, median(selected.map((p) => p.total)));
  result.forces.forEach((f, i) => close(f.score, median(selected.map((p) => p.forces[i].score))));
}
// 验证直接取原始项目中位数，不能对上级中位数再次取中位数。
const unequal = [10, 20, 30, 80, 100].map((total, i) => ({ ...projects[0], total, city: i < 3 ? 'A' : 'B' }));
assert.equal(summarizeSixForces(unequal).total, 30);
assert.notEqual(summarizeSixForces(unequal).total, median([20, 90]));
assert.ok(projects.some((p) => p.total !== buildSixForceProjects(current.filter((r) => r.period === '2026-09')).find((x) => x.name === p.name)!.total), 'period changes update simulated assessments');
assert.equal(summarizeSixForces([]).count, 0);
assert.equal(summarizeSixForces([]).total, 0);
assert.deepEqual(buildSixForceProjects([]), []);
console.log('通过：六力指标、能力和总分逐层对账，总部/区域/城市项目中位数、奇偶样本及非均衡分组，实际项目排名，期间切换及空数据。');

// 四分位数与现有中位数口径一致，且不修改原始输入。

assert.equal(scoreDistribution([]), null);
assert.deepEqual(scoreDistribution([8]), { count: 1, min: 8, q1: 8, median: 8, q3: 8, max: 8 });
assert.deepEqual(scoreDistribution([100, 0]), { count: 2, min: 0, q1: 25, median: 50, q3: 75, max: 100 });
assert.deepEqual(scoreDistribution([10, 20, 30, 40, 50]), { count: 5, min: 10, q1: 20, median: 30, q3: 40, max: 50 });
assert.deepEqual(scoreDistribution([6, 6, 6]), { count: 3, min: 6, q1: 6, median: 6, q3: 6, max: 6 });
const raw = [9, 1, 7, 3];
scoreDistribution(raw);
assert.deepEqual(raw, [9, 1, 7, 3]);
for (const metric of [-1, 0, 1, 2, 3, 4, 5]) {
  const scores = projects.map((p) => metric < 0 ? p.total : p.forces[metric].score);
  const distribution = scoreDistribution(scores)!;
  close(distribution.median, median(scores));
  assert.ok(distribution.min <= distribution.q1 && distribution.q1 <= distribution.median && distribution.median <= distribution.q3 && distribution.q3 <= distribution.max);
}
console.log('通过：分布图空样本、单项目、奇偶项目、重复得分、四分位数、中位数一致性及原数据不变。');

const bubbles = buildProjectScoreBubbles(current);
assert.equal(bubbles.length, projects.length);
assert.equal(new Set(bubbles.map((p) => p.name)).size, bubbles.length);
for (const bubble of bubbles) {
  const project = projects.find((p) => p.name === bubble.name)!;
  close(bubble.score, project.total);
  assert.equal(bubble.status, project.status);
  close(bubble.conversion!, bubble.contracts / bubble.leads * 100);
  assert.equal(bubble.contracts, current.filter((r) => r.project === bubble.name).reduce((sum, r) => sum + r.contracts, 0));
}
assert.deepEqual(buildProjectScoreBubbles([]), []);
assert.equal(buildProjectScoreBubbles([{ ...current[0], leads: 0, contracts: 0 }])[0].conversion, null);
console.log('通过：项目气泡唯一性、六力得分及预警对账、项目汇总转化率、签约规模和零线索处理。');

const scoreGrid = projectScoreGrid(bubbles);
assert.equal(scoreGrid.cells.length, 9);
assert.equal(scoreGrid.points.length, bubbles.length);
assert.ok(scoreGrid.low > 0 && scoreGrid.high > scoreGrid.low && scoreGrid.max > scoreGrid.high);
assert.equal(scoreGrid.cells.reduce((sum, c) => sum + scoreGrid.points.filter((p) => p.cell.id === c.id).length, 0), bubbles.length);
const one = bubbles[0];
const boundary = projectScoreGrid([59.9, 60, 84.9, 85].map((score, i) => ({ ...one, name: String(i), score, conversion: i + 1 })));
assert.deepEqual(boundary.points.map((p) => p.cell.row), [2, 1, 1, 0]);
assert.equal(projectScoreGrid([{ ...one, conversion: null }]).points.length, 0);
for (const conversion of [0, 5]) {
  const same = projectScoreGrid([{ ...one, conversion }]);
  assert.equal(same.fallback, true);
  assert.ok(same.low > 0 && same.high > same.low && same.max > same.high);
}
console.log('通过：项目得分九宫格唯一归属、得分边界、转化率分位数、单项目退化和零分母排除。');

assert.deepEqual([0, 60, 85, 100].map((n) => projectScoreCoordinate(n, [0, 60, 85, 100])), [0, 1, 2, 3]);
assert.equal(projectScoreCoordinate(72.5, [0, 60, 85, 100]), 1.5);
assert.equal(projectScoreCoordinate(92.5, [0, 60, 85, 100]), 2.5);
const breaks = [0, scoreGrid.low, scoreGrid.high, scoreGrid.max];
assert.deepEqual(breaks.map((n) => projectScoreCoordinate(n, breaks)), [0, 1, 2, 3]);
for (const point of scoreGrid.points) {
  const x = projectScoreCoordinate(point.conversion!, breaks);
  const y = projectScoreCoordinate(point.score, [0, 60, 85, 100]);
  assert.ok(x >= point.cell.col && x <= point.cell.col + 1);
  assert.ok(y >= 2 - point.cell.row && y <= 3 - point.cell.row);
}
console.log('通过：等宽等高分段坐标、真实边界映射、区间内比例与项目分区归属一致。');

for (const sample of [current, current.filter((r) => r.period === '2026-09'), records.filter((r) => r.period >= '2025-01' && r.period <= '2025-09')]) {
  const balanced = buildSixForceProjects(sample);
  const counts = ['优秀', '关注', '预警'].map((status) => balanced.filter((p) => p.status === status).length);
  assert.deepEqual(counts, [3, 3, 2], 'default, monthly and prior-year assessments retain balanced demo groups');
}
const filteredBubbles = buildProjectScoreBubbles(current.filter((r) => r.channel === '线上获客'));
assert.deepEqual(filteredBubbles.map((p) => [p.name, p.score, p.status]).sort(), bubbles.map((p) => [p.name, p.score, p.status]).sort(), 'filtering must not reassign demo baseline or alter project identities');
console.log('通过：模拟项目优秀3个、关注3个、预警2个，跨期间与筛选保持稳定，气泡与六力明细一致。');
