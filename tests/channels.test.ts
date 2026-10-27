import assert from 'node:assert/strict';
import { channelCatalog, channelLeaves } from '../src/mocks/channels';
import { records } from '../src/mocks/data';
import { channelTree } from '../src/utils/channels';
import { filterRows, groupRows, summarize } from '../src/utils/metrics';
import { bubbleColor, channelColors } from '../src/charts/themes/bubbles';
import { nineGridOption } from '../src/charts/options/nineGrid';
import { buildNineGrid, filterGridByChannel } from '../src/utils/nineGrid';
import type { DashboardFilter } from '../src/types';
assert.deepEqual(
  channelCatalog.map((c) => c.name),
  ['自然到访', '中介分销', '自渠自拓', '线上获客', '老带新', '全面营销', '其他'],
);
assert.equal(channelCatalog.find((c) => c.name === '全面营销')?.alias, '全民营销');
assert.equal(new Set(channelLeaves.map((l) => l.channelDetailId)).size, channelLeaves.length);
assert.equal(
  new Set(channelLeaves.map((l) => l.channelDetail)).size,
  channelLeaves.length,
  'flat touchpoint labels must not merge across suppliers',
);
assert.ok(
  records.every((r) =>
    channelLeaves.some(
      (l) =>
        l.channel === r.channel &&
        l.channelObjectId === r.channelObjectId &&
        l.channelDetailId === r.channelDetailId,
    ),
  ),
);
assert.equal(records.length, 24 * 8 * 3 * channelLeaves.length);
const f: DashboardFilter = {
  organization: '',
  region: '',
  city: '',
  project: '',
  channel: '',
  customer: '',
  basis: '签约口径',
  period: ['2026-01', '2026-09'],
};
const tree = channelTree(records);
assert.equal(tree.length, 7);
const online = tree.find((n) => n.label === '线上获客')!;
const wechat = online.children!.find((n) => n.label === '微信')!;
assert.equal(wechat.children!.length, 4);
const chosen = filterRows(records, {
  ...f,
  channel: '线上获客',
  channelObject: 'online-wechat',
  channelDetail: 'online-wechat-0',
});
assert.ok(chosen.length > 0);
assert.ok(chosen.every((r) => r.channelObject === '微信' && r.channelDetail === '微信 · 视频号'));
const selected = filterRows(records, f),
  total = summarize(selected);
for (const dimension of ['channel', 'channelObject', 'channelDetail'] as const) {
  const rows = groupRows(selected, dimension);
  assert.equal(
    rows.reduce((a, r) => a + r.amount, 0),
    total.amount,
  );
  assert.equal(
    rows.reduce((a, r) => a + r.contracts, 0),
    total.contracts,
  );
  assert.ok(Math.abs(rows.reduce((a, r) => a + r.fee, 0) - total.fee) < 1e-6);
}
const t = { x: 5, cost: 3, conversion: 3, minContracts: 10 };
const categories = buildNineGrid(records, f, 'channel', 'yoy', t, 'category'),
  objects = buildNineGrid(records, f, 'channel', 'yoy', t, 'object'),
  details = buildNineGrid(records, f, 'channel', 'yoy', t, 'detail');
assert.equal(categories.total, 7);
assert.equal(
  objects.total,
  channelCatalog.reduce((a, c) => a + c.objects.length, 0),
);
assert.equal(details.total, channelLeaves.length);
for (const result of [categories, objects, details])
  assert.equal(
    result.points.reduce((a, p) => a + p.current.amount, 0),
    total.amount,
  );
const platform = buildNineGrid(
  records,
  { ...f, channel: '线上获客', channelObject: 'online-wechat' },
  'channel',
  'yoy',
  t,
  'detail',
);
assert.equal(platform.total, 4);
assert.ok(platform.points.every((p) => p.group === '线上获客'));
console.log(
  `通过：7 大类、${objects.total} 个供应商/平台对象、${details.total} 个触点，层级筛选、稳定ID和各层级汇总一致。`,
);

// 图例只筛选当前渠道九宫格，保留二级对象、比较基数与颜色映射。
assert.equal(new Set(Object.values(channelColors)).size, 7);
for (const category of channelCatalog) {
  const view = filterGridByChannel(objects, category.name);
  assert.equal(view.total, category.objects.length);
  assert.ok(view.points.every((p) => p.group === category.name));
  assert.equal(
    view.points.reduce((sum, p) => sum + p.current.amount, 0),
    objects.points
      .filter((p) => p.group === category.name)
      .reduce((sum, p) => sum + p.current.amount, 0),
  );
  const option = nineGridOption(view, 'channel', t, '', '', false);
  assert.equal(option.legend.show, false);
  const series = option.series.find((s) => s.name === category.name);
  assert.equal(series.itemStyle.color, channelColors[category.name]);
}
assert.equal(objects.total, 27);
assert.equal(filterGridByChannel(objects, ''), objects);
assert.equal(filterGridByChannel(objects, '不存在的渠道').total, 0);
const noBaseline = buildNineGrid(
  records,
  { ...f, period: ['2025-01', '2025-03'] },
  'channel',
  'yoy',
  t,
  'object',
);
const noBaselineOnline = filterGridByChannel(noBaseline, '线上获客');
assert.equal(noBaselineOnline.points.length, 0);
assert.equal(noBaselineOnline.excluded.length, 5);
assert.equal(noBaselineOnline.total, 5);
assert.equal(bubbleColor('线上获客'), channelColors['线上获客']);
assert.equal(bubbleColor('新增渠道'), bubbleColor('新增渠道'));
console.log('通过：图例筛选、二级对象数量、不可比对象同步、返回全部和固定分类颜色。');
