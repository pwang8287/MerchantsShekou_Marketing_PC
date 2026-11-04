import type { EChartsOption, TooltipComponentOption } from 'echarts';

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
interface Size {
  width: number;
  height: number;
}

// 常规图表提示框跟随指针，在视口边缘换边；不受卡片 overflow 裁切。
export function placeFloatingTooltip(
  bounds: Bounds,
  point: number[],
  content: Size,
  viewport: Size,
): [number, number] {
  const gap = 12;
  const pointerX = bounds.left + point[0],
    pointerY = bounds.top + point[1];
  const clamp = (value: number, length: number, limit: number) =>
    Math.max(gap, Math.min(value, limit - length - gap));
  const x =
    pointerX + gap + content.width <= viewport.width - gap
      ? pointerX + gap
      : pointerX - gap - content.width;
  const y =
    pointerY + gap + content.height <= viewport.height - gap
      ? pointerY + gap
      : pointerY - gap - content.height;
  return [clamp(x, content.width, viewport.width), clamp(y, content.height, viewport.height)];
}

// 先避开整个环形图，再根据可用空间换边；返回视口坐标。
export function placeDonutTooltip(bounds: Bounds, content: Size, viewport: Size): [number, number] {
  const gap = 12;
  const clamp = (value: number, length: number, limit: number) =>
    Math.max(gap, Math.min(value, Math.max(gap, limit - length - gap)));
  const y = clamp(
    (bounds.top + bounds.bottom - content.height) / 2,
    content.height,
    viewport.height,
  );
  if (bounds.right + gap + content.width <= viewport.width - gap) return [bounds.right + gap, y];
  if (bounds.left - gap - content.width >= gap) return [bounds.left - gap - content.width, y];
  const x = clamp(bounds.left, content.width, viewport.width);
  if (bounds.bottom + gap + content.height <= viewport.height - gap)
    return [x, bounds.bottom + gap];
  if (bounds.top - gap - content.height >= gap) return [x, bounds.top - gap - content.height];
  return [x, y];
}

export function donutTooltip(): TooltipComponentOption {
  return {
    trigger: 'item',
    renderMode: 'html',
    appendTo: 'body',
    confine: false,
    className: 'dashboard-donut-tooltip',
    enterable: false,
    transitionDuration: 0,
    hideDelay: 80,
    padding: [12, 14],
    borderColor: '#DFE7F1',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    textStyle: { color: '#43546E', fontSize: 12 },
    extraCssText:
      'width:252px;max-width:calc(100vw - 24px);white-space:normal;overflow-wrap:anywhere;line-height:1.65;border-radius:8px;box-shadow:0 8px 24px rgba(16,35,63,.14);pointer-events:none;z-index:1100;',
    formatter: '{b}<br/>{c} 组 · 占比 {d}%',
  };
}

// host 由图表生命周期传入，避免依赖首次渲染时的 DOM 或滚动前的位置。
export function configureChartTooltip(option: EChartsOption, host: HTMLElement): EChartsOption {
  const tooltip = option.tooltip;
  if (
    !tooltip ||
    Array.isArray(tooltip) ||
    !['dashboard-donut-tooltip', 'dashboard-floating-tooltip'].includes(tooltip.className || '')
  )
    return option;
  const positioned: TooltipComponentOption = {
    ...tooltip,
    position(point, _params, _dom, _rect, size) {
      const bounds = host.getBoundingClientRect();
      const document = host.ownerDocument;
      const viewport = {
        width:
          document.documentElement.clientWidth ||
          document.defaultView?.innerWidth ||
          size.viewSize[0],
        height:
          document.documentElement.clientHeight ||
          document.defaultView?.innerHeight ||
          size.viewSize[1],
      };
      const content = { width: size.contentSize[0], height: size.contentSize[1] };
      const [x, y] =
        tooltip.className === 'dashboard-donut-tooltip'
          ? placeDonutTooltip(bounds, content, viewport)
          : placeFloatingTooltip(bounds, point, content, viewport);
      return [x - bounds.left, y - bounds.top];
    },
  };
  return { ...option, tooltip: positioned };
}
