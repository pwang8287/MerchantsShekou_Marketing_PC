import assert from 'node:assert/strict';
import { comparisonChange, comparisonState, comparisonHtml } from '../src/utils/comparison';
assert.equal(comparisonState(8).tone, 'rise');
assert.equal(comparisonState(8).text, '+8.00% ▲');
assert.equal(comparisonState(-8).tone, 'fall');
assert.equal(comparisonState(-8).text, '-8.00% ▼');
assert.equal(comparisonState(0).text, '0.00%');
assert.equal(comparisonState(0, 'pct').text, '0.00 pct');
assert.equal(comparisonState(0.004).text, '+>0.01% ▲');
assert.equal(comparisonState(-0.004).text, '-<0.01% ▼');
for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
  assert.equal(comparisonState(value).tone, 'neutral');
  assert.equal(comparisonState(value).text, '-');
}
assert.equal(comparisonState(-2.3, 'pct').text, '-2.30 pct ▼');
assert.ok(comparisonHtml(-5).includes('comparison-badge--fall'));
assert.ok(comparisonHtml(5).includes('comparison-badge--rise'));
assert.ok(comparisonHtml(null).includes('无可比数据'));
assert.equal(comparisonChange(30, 20, true), 10, '比例指标使用原始百分点差而非相对增长率');
assert.equal(comparisonChange(30, 20), 50, '数量增长率保留百分比');
assert.equal(comparisonChange(0, 100), -100, '真实零值仍可比较');
for (const value of [null, undefined, 0, NaN]) assert.equal(comparisonChange(100, value), null);
assert.equal(comparisonChange(null, 100), null);
console.log(
  '通过：上升红色/下降绿色的统一状态、正负号与三角图标、两位精度、小数非零、pct差值和零基数保护。',
);

// 验证实际图表提示框不再因成本越低越好而反转方向颜色。
import { withContext } from '../src/charts/options/tooltip';
import { records } from '../src/mocks/data';
import { summarize } from '../src/utils/metrics';
import { kpiRowValues, kpiColumns } from '../src/utils/kpiDrilldown';
const filter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径' as const,
  period: ['2026-10', '2026-10'] as [string, string],
};
const facts = [
  { ...records[0], period: '2026-10', fee: 2, contracts: 10 },
  { ...records[0], period: '2025-10', fee: 1, contracts: 10 },
];
const tooltip = withContext({ tooltip: {} }, facts, filter, '元/套', '').tooltip as any;
const html = tooltip.formatter({
  name: '2026-10',
  seriesName: '签约获客成本',
  seriesType: 'bar',
  value: 2000,
});
assert.ok(
  html.includes('comparison-badge--rise') && html.includes('+100.00% ▲'),
  '成本上升同样为红色上升状态',
);
const current = summarize([{ ...records[0], target: 100, amount: 30 }]);
const before = summarize([{ ...records[0], target: 100, amount: 20 }]);
assert.equal(kpiRowValues(current, before, before, current, 'completion').yoy, 10);
assert.equal(kpiColumns('completion').find((c) => c.key === 'yoy')?.unit, 'pct');
console.log('通过：成本图表提示框方向一致、完成率下钻使用pct原值差。');
