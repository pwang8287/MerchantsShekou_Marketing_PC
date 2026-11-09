import type { AggregateRow } from '../types';
import { summarize } from './metrics';

export const isChannelAverage = (row: { name: string }) => row.name === '平均值';

/** Average channel values, excluding unavailable unit costs rather than treating them as zero. */
export function averageChannelValue<T>(rows: T[], value: (row: T) => number | null): number | null {
  const values = rows
    .map(value)
    .filter((item): item is number => item !== null && Number.isFinite(item));
  return values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : null;
}

/** Ratios of these averaged additive values equal ratios of the original totals. */
export function channelAverageRow(rows: AggregateRow[]): AggregateRow | null {
  if (!rows.length) return null;
  const total = summarize(rows.flatMap((row) => row.records));
  return {
    ...total,
    ...Object.fromEntries(Object.entries(total).map(([key, value]) => [key, value / rows.length])),
    completion: total.completion,
    conversion: total.conversion,
    acquisition:
      averageChannelValue(rows, (row) =>
        row.contracts ? (row.fee * 10000) / row.contracts : null,
      ) ?? 0,
    roi: total.roi,
    name: '平均值',
    records: [],
  } as AggregateRow;
}
