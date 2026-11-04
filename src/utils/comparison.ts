import { fmt } from './metrics';
export type ComparisonUnit = '%' | 'pct';
export type ComparisonTone = 'rise' | 'fall' | 'neutral';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
// 比例指标传入已按百分数表示的原值，例如 12.35 表示 12.35%。
export function comparisonChange(
  current: number | null | undefined,
  previous: number | null | undefined,
  percentagePoint = false,
): number | null {
  if (!isNumber(current) || !isNumber(previous) || previous === 0) return null;
  const result = percentagePoint ? current - previous : ((current - previous) / previous) * 100;
  return Number.isFinite(result) ? result : null;
}
export function comparisonState(value: number | null | undefined, unit: ComparisonUnit = '%') {
  if (!isNumber(value)) return { tone: 'neutral' as ComparisonTone, text: '-', missing: true };
  const tone: ComparisonTone = value > 0 ? 'rise' : value < 0 ? 'fall' : 'neutral';
  const suffix = unit === 'pct' ? ' pct' : '%';
  if (value === 0) return { tone, text: `0.00${suffix}`, missing: false };
  // 保留原始方向；小于最小展示精度的非零值不能显示成零。
  const magnitude =
    Math.abs(value) < 0.01 ? (value > 0 ? '>0.01' : '<0.01') : fmt(Math.abs(value), 2);
  return {
    tone,
    text: `${value > 0 ? '+' : '-'}${magnitude}${suffix} ${value > 0 ? '▲' : '▼'}`,
    missing: false,
  };
}
export function comparisonHtml(value: number | null | undefined, unit: ComparisonUnit = '%') {
  const state = comparisonState(value, unit);
  return `<span class="comparison-badge comparison-badge--${state.tone}"${state.missing ? ' title="无可比数据"' : ''}>${state.text}</span>`;
}
