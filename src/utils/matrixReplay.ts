import type { GridPoint } from '../types/nineGrid';

// 固定末月背景，仅用播放月数据替换选中对象；缺失月份不虚构位置。
export function matrixReplayPoints(
  snapshot: GridPoint[],
  frame: GridPoint[],
  selectedName: string,
) {
  const moving = selectedName ? frame.find((point) => point.name === selectedName) : undefined;
  return [...snapshot]
    .sort((a, b) => b.current.amount - a.current.amount)
    .flatMap((point) => (point.name === selectedName ? (moving ? [moving] : []) : [point]));
}
