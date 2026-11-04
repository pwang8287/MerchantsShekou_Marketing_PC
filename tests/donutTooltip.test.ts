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

// 渠道成本柱状图：提示框独立挂载，并在屏幕边缘换边，不被卡片裁切。
import { efficiencyOption } from '../src/charts/options';
import { placeFloatingTooltip } from '../src/charts/options/donutTooltip';
const costOption = configureChartTooltip(withContext(efficiencyOption(records), records, filter, '元/套', ''), host);
const costTooltip = costOption.tooltip as any;
assert.equal(costTooltip.appendTo, 'body');
assert.equal(costTooltip.confine, false);
assert.equal(costTooltip.renderMode, 'html');
assert.equal(typeof costTooltip.formatter, 'function');
for (const point of [[0,0],[5,250],[1300,650],[800,300]]) {
  const result = placeFloatingTooltip({left:30,top:200,right:500,bottom:500},point,{width:420,height:160},{width:1440,height:900});
  assert.ok(result[0]>=12 && result[1]>=12);
  assert.ok(result[0]+420<=1428 && result[1]+160<=888);
}
const movedHost = {...host,getBoundingClientRect:()=>({left:1200,top:700,right:1400,bottom:900})};
const moved = configureChartTooltip(costOption,movedHost).tooltip as any;
const position = moved.position([150,100],{},null,null,{contentSize:[420,160],viewSize:[200,200]});
assert.ok(position[0]<0 && position[1]<100,'允许提示框越过图表边界向视口内避让');
assert.ok(position[0]+1200>=12 && position[0]+1200+420<=1428);
console.log('通过：渠道获客成本提示框挂载body、保持内容、左右及底部换边、视口边界避让。');

import { barOption } from '../src/charts/options';
const ranking = configureChartTooltip(withContext(barOption(groupRows(records,'project')),records,filter,'万元','签约金额 · 万元'),movedHost);
const rankingTooltip = ranking.tooltip as any;
assert.equal(rankingTooltip.appendTo,'body');
assert.equal(rankingTooltip.confine,false);
const rankingPosition = rankingTooltip.position([20,100],{},null,null,{contentSize:[420,160],viewSize:[200,200]});
assert.ok(rankingPosition[0]+1200>=12 && rankingPosition[0]+1200+420<=1428);
assert.ok(rankingPosition[1]+700>=12 && rankingPosition[1]+700+160<=888);
assert.ok(rankingTooltip.formatter({name:records[0].project,seriesName:'签约金额',seriesType:'bar',value:100}).includes('同比'));
console.log('通过：销售业绩排名复用浮层定位，屏幕右侧及底部不裁切且保留同环比内容。');
