// 最大余数法分配整数，确保每个父级总额与子级合计一致。
export function allocateInteger(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const values = raw.map(Math.floor);
  const remainder = total - values.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, remainder: v - values[i] }))
    .sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remainder; i++) values[order[i % order.length].i]++;
  return values;
}
