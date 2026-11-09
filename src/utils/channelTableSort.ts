import { isChannelAverage } from './channelAverage';

export interface ChannelTableSort {
  prop: string;
  order: 'ascending' | 'descending' | null;
}

/** Keep the reference row at the bottom while sorting raw numbers, not formatted text. */
export function sortChannelTable<T extends { name: string }>(
  rows: T[],
  sort: ChannelTableSort,
  value: (row: T, key: string) => string | number | null | undefined,
): T[] {
  if (!sort.order) return rows;
  const direction = sort.order === 'ascending' ? 1 : -1;
  return [
    ...rows
      .filter((row) => !isChannelAverage(row))
      .sort((a, b) => {
        const left = value(a, sort.prop);
        const right = value(b, sort.prop);
        if (left === null || left === undefined)
          return right === null || right === undefined ? 0 : 1;
        if (right === null || right === undefined) return -1;
        return (
          direction *
          (typeof left === 'string'
            ? left.localeCompare(String(right), 'zh-CN')
            : left - Number(right))
        );
      }),
    ...rows.filter(isChannelAverage),
  ];
}
