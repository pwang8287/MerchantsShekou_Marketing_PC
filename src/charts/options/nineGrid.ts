import type { EChartsOption } from 'echarts';
import type { GridPoint, GridResult, GridThresholds, NineGridKind } from '../../types/nineGrid';
import { fmt } from '../../utils/metrics';
import { bubblePalette, bubbleColor } from '../themes/bubbles';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function nineGridOption(
  result: GridResult,
  kind: NineGridKind,
  thresholds: GridThresholds,
  selectedCell: string,
  selectedName: string,
  showLabels: boolean,
): EChartsOption {
  const advisor = kind === 'advisor',
    yThreshold = advisor ? thresholds.conversion : thresholds.cost;
  const xExtent = Math.max(
    30,
    Math.ceil(Math.max(thresholds.x * 2, ...result.points.map((p) => Math.abs(p.x) * 1.2)) / 10) *
      10,
  );
  const yExtent = Math.max(
    advisor ? 10 : 20,
    Math.ceil(Math.max(yThreshold * 2, ...result.points.map((p) => Math.abs(p.y) * 1.2)) / 5) * 5,
  );
  const xs = [-xExtent, -thresholds.x, thresholds.x, xExtent],
    ys = [yExtent, yThreshold, -yThreshold, -yExtent];
  const groups = [...new Set(result.points.map((p) => p.group))];
  const maxAmount = Math.max(...result.points.map((p) => p.current.amount), 1);
  const colors = { good: '#F0FAF6', risk: '#FFF3F5', neutral: '#F1F5FF' };
  const axisStyle = {
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { color: '#71809A', fontSize: 11 },
    nameTextStyle: { color: '#52617B', fontSize: 11 },
  };
  return {
    animationDuration: 300,
    legend: {
      show: kind !== 'channel',
      top: 0,
      left: 0,
      type: 'scroll',
      itemWidth: 9,
      itemHeight: 9,
      icon: 'circle',
      textStyle: { fontSize: 10, color: '#71809A' },
      data: groups,
    },
    grid: { left: 56, right: 32, top: kind === 'channel' ? 42 : 65, bottom: 54 },
    xAxis: {
      type: 'value',
      min: -xExtent,
      max: xExtent,
      name: 'X · 签约套数增长率（%）',
      nameLocation: 'middle',
      nameGap: 32,
      ...axisStyle,
      axisLabel: { ...axisStyle.axisLabel, formatter: '{value}%' },
    },
    yAxis: {
      type: 'value',
      min: -yExtent,
      max: yExtent,
      name: advisor ? 'Y · 到访转签约率变化（百分点）' : 'Y · 单套获客成本变化率（%）',
      nameLocation: 'end',
      nameGap: 18,
      ...axisStyle,
      axisLabel: { ...axisStyle.axisLabel, formatter: advisor ? '{value} pp' : '{value}%' },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#fff',
      borderColor: '#DFE7F1',
      textStyle: { fontSize: 12, color: '#43546E' },
      extraCssText: 'box-shadow:0 12px 30px #10233f20;border-radius:10px;',
      formatter: (input: unknown) => {
        const data = (input as { data: { point?: GridPoint } }).data;
        const p = data?.point;
        if (!p) return '点击分区筛选该区对象';
        return `<b>${escape(p.name)}</b><br/>${escape(p.cell.name)} · ${escape(p.group)}<br/>签约套数：${fmt(p.current.contracts)} / 比较期 ${fmt(p.previous.contracts)}<br/>签约量变化：${fmt(p.x, 1)}%<br/>${advisor ? '到访转签约率变化' : '单套获客成本变化'}：${fmt(p.y, 1)} ${advisor ? '个百分点' : '%'}<br/>${advisor ? '到访转签约率：' + fmt((p.current.contracts / p.current.visits) * 100, 1) + '%' : '单套获客成本：' + fmt(p.current.acquisition) + ' 元/套'}<br/>签约金额：${fmt(p.current.amount)} 万元<br/><span style="color:#71809a">点击查看指标与客户来源明细</span>`;
      },
    },
    series: [
      {
        type: 'scatter',
        name: '分区',
        data: [],
        silent: false,
        markArea: {
          silent: false,
          itemStyle: { borderWidth: 1, borderColor: '#DFE7F1' },
          label: { position: 'insideTopLeft', fontSize: 11 },
          data: result.cells.map((c) => [
            {
              name: c.name,
              xAxis: xs[c.col],
              yAxis: ys[c.row],
              itemStyle: {
                color: colors[c.tone],
                opacity: selectedCell && selectedCell !== c.id ? 0.4 : 1,
              },
              label: {
                color: c.tone === 'good' ? '#159C77' : c.tone === 'risk' ? '#DF5963' : '#2873ED',
                padding: [9, 8],
              },
            },
            { xAxis: xs[c.col + 1], yAxis: ys[c.row + 1] },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#A8B9D1', width: 1, type: 'solid' },
          label: {
            show: true,
            color: '#71809A',
            fontSize: 10,
            formatter: (p: unknown) => {
              const v = Number((p as { value: number }).value);
              return `${v > 0 ? '+' : ''}${v}${(p as { data: { xAxis?: number } }).data.xAxis !== undefined ? '%' : advisor ? 'pp' : '%'}`;
            },
          },
          data: [
            { xAxis: -thresholds.x },
            { xAxis: thresholds.x },
            { yAxis: -yThreshold },
            { yAxis: yThreshold },
          ],
        },
      },
      ...groups.map((group, i) => ({
        name: group,
        type: 'scatter' as const,
        label: {
          show: showLabels,
          position: 'top' as const,
          fontSize: 10,
          color: '#43546E',
          formatter: (p: unknown) =>
            (p as { data: { point: GridPoint } }).data.point.name.split(' · ')[0],
        },
        symbolSize: (v: unknown) => Math.max(8, Math.sqrt((v as number[])[2] / maxAmount) * 52),
        itemStyle: {
          color: kind === 'channel' ? bubbleColor(group) : bubblePalette[i % bubblePalette.length],
          borderColor: '#fff',
          borderWidth: 1.5,
        },
        emphasis: { scale: 1.1, itemStyle: { borderColor: '#14243D', borderWidth: 2 } },
        data: result.points
          .filter((p) => p.group === group)
          .map((p) => ({
            name: p.name,
            value: [p.x, p.y, p.current.amount],
            point: { ...p, records: [] },
            itemStyle: {
              opacity: selectedCell && p.cell.id !== selectedCell ? 0.15 : 0.86,
              borderColor: selectedName === p.name ? '#14243D' : '#fff',
              borderWidth: selectedName === p.name ? 2.5 : 1.5,
            },
          })),
      })),
    ],
  };
}
