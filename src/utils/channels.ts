import type { MarketingPerformanceMetric } from '../types';
export interface ChannelTreeNode {
  value: string;
  label: string;
  children?: ChannelTreeNode[];
}
export function channelTree(rows: MarketingPerformanceMetric[]): ChannelTreeNode[] {
  const roots = new Map<string, Map<string, ChannelTreeNode>>();
  rows.forEach((r) => {
    if (!roots.has(r.channel)) roots.set(r.channel, new Map());
    const objects = roots.get(r.channel)!;
    if (!objects.has(r.channelObjectId))
      objects.set(r.channelObjectId, {
        value: r.channelObjectId,
        label: r.channelObject,
        children: [],
      });
    const node = objects.get(r.channelObjectId)!;
    if (!node.children!.some((n) => n.value === r.channelDetailId))
      node.children!.push({ value: r.channelDetailId, label: r.channelDetail });
  });
  return [...roots].map(([label, children]) => ({
    value: label,
    label,
    children: [...children.values()],
  }));
}
