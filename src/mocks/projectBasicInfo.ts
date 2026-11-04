export interface ProjectBasicInformation {
  name: string;
  equityRatio: number;
  consolidation: string;
  landPrice: number;
  equityLandPrice: number;
  saleableLandPrice: number;
  collectionLandCoverage: number;
  openingActual: string | null;
  openingPlanned: string;
  completionActual: string | null;
  completionPlanned: string;
  sellThroughAnalysis: string;
  sectorAnalysis: string;
  shareholders: { name: string; ratio: number; operation: string }[];
}

// 固定项目基础信息演示档案；金额单位：亿元，单方地价：元/平方米。
const profiles = [
  ['上海·招商时代乐章', 100, 7.2, 21958],
  ['上海·招商苏河玺', 100, 18.6, 38600],
  ['杭州·招商闻博花城', 60, 12.8, 18500],
  ['南京·招商江心印', 51, 9.3, 16200],
  ['深圳·招商玺家园', 100, 26.5, 42500],
  ['广州·招商臻园', 60, 11.4, 17800],
  ['成都·招商未来公园', 80, 6.8, 12500],
  ['重庆·招商渝天府', 51, 5.9, 10800],
] as const;

export const projectBasicInfo: Record<string, ProjectBasicInformation> = Object.fromEntries(
  profiles.map(([name, equityRatio, landPrice, saleableLandPrice], index) => [
    name,
    {
      name,
      equityRatio,
      consolidation: '并表',
      landPrice,
      equityLandPrice: (landPrice * equityRatio) / 100,
      saleableLandPrice,
      collectionLandCoverage: 7.58 + index * 2.15,
      openingActual:
        index === 0 || index === 6
          ? null
          : index === 1 || index === 4
            ? '2026-10-30'
            : '2025-06-18',
      openingPlanned:
        index === 0 || index === 6
          ? '2026-12-04'
          : index === 1 || index === 4
            ? '2026-12-04'
            : '2025-06-28',
      completionActual: index === 3 || index === 7 ? '2026-09-20' : null,
      completionPlanned: index === 3 || index === 7 ? '2026-10-08' : '2028-08-06',
      sellThroughAnalysis:
        index % 3 === 0
          ? '去化弱，售估比低'
          : index % 3 === 1
            ? '去化强，售估比高'
            : '去化平稳，售估比适中',
      sectorAnalysis:
        index % 3 === 0
          ? '板块弱，售估比低'
          : index % 3 === 1
            ? '板块强，售估比高'
            : '板块平稳，售估比适中',
      shareholders: [],
    },
  ]),
);
