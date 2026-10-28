// 线性插值分位数：位置为 (n - 1) × p；与现有中位数的奇偶样本口径一致。
export function scoreDistribution(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const quantile = (p: number) => {
    const position = (sorted.length - 1) * p;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  };
  return {
    count: sorted.length,
    min: sorted[0],
    q1: quantile(0.25),
    median: quantile(0.5),
    q3: quantile(0.75),
    max: sorted[sorted.length - 1],
  };
}
