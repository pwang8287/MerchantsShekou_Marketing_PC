import assert from 'node:assert/strict';
import { placeDonutTooltip, configureChartTooltip } from '../src/charts/options/donutTooltip';
import { donutOption } from '../src/charts/options';
import { withContext } from '../src/charts/options/tooltip';
import { bubbleColor } from '../src/charts/themes/bubbles';
import { records } from '../src/mocks/data';
import { groupRows } from '../src/utils/metrics';
const content = { width: 252, height: 210 };
const right = placeDonutTooltip({ left: 30, top: 200, right: 220, bottom: 400 }, content, {
  width: 1440,
  height: 900,
});
assert.ok(right[0] >= 232, 'tooltip must clear the ring on the right');
const left = placeDonutTooltip({ left: 1200, top: 200, right: 1390, bottom: 400 }, content, {
  width: 1440,
  height: 900,
});
assert.ok(left[0] + content.width <= 1188, 'tooltip must flip to left at screen edge');
const below = placeDonutTooltip({ left: 90, top: 100, right: 270, bottom: 300 }, content, {
  width: 360,
  height: 800,
});
assert.ok(below[1] >= 312, 'narrow viewport uses space below');
const above = placeDonutTooltip({ left: 90, top: 420, right: 270, bottom: 580 }, content, {
  width: 360,
  height: 600,
});
assert.ok(above[1] + content.height <= 408, 'near screen bottom uses space above');
for (const [position, viewport] of [
  [right, { width: 1440, height: 900 }],
  [left, { width: 1440, height: 900 }],
  [below, { width: 360, height: 800 }],
  [above, { width: 360, height: 600 }],
] as const) {
  assert.ok(position[0] >= 12 && position[1] >= 12);
  assert.ok(position[0] + content.width <= viewport.width - 12);
  assert.ok(position[1] + content.height <= viewport.height - 12);
}
const filter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径' as const,
  period: ['2026-01', '2026-09'] as [string, string],
};
const groups = groupRows(
  records.filter((r) => r.period >= '2026-01' && r.period <= '2026-09'),
  'channel',
);
const option = donutOption(groups, { showLegend: false, colorForName: bubbleColor });
const host = {
  getBoundingClientRect: () => ({ left: 30, top: 200, right: 220, bottom: 400 }),
  ownerDocument: { documentElement: { clientWidth: 1440, clientHeight: 900 } },
} as unknown as HTMLElement;
const configured = configureChartTooltip(withContext(option, records, filter, '组', ''), host);
const tooltip = configured.tooltip;
assert.equal(tooltip.appendTo, 'body');
assert.equal(tooltip.confine, false);
assert.equal(option.legend.show, false);
assert.deepEqual(
  tooltip.position([20, 20], {}, null, null, { contentSize: [252, 210], viewSize: [190, 200] }),
  [202, -5],
);
for (const item of option.series[0].data)
  assert.equal(item.itemStyle.color, bubbleColor(item.name));
const html = tooltip.formatter({
  name: '自然到访',
  seriesType: 'pie',
  seriesName: '',
  value: 123,
  percent: 12.3,
});
assert.ok(html.includes('自然到访') && html.includes('123 组') && html.includes('12.3%'));
assert.ok(html.includes('donut-tooltip-row') && html.includes('同比') && html.includes('环比'));
console.log('通过：环形图提示框左右换边、上下避让、屏幕边界、独立浮层及表格色块一致性。');
