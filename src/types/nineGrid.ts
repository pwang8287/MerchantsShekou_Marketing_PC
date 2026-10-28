import type { MarketingPerformanceMetric, Summary } from './index';
export type NineGridKind = 'channel' | 'project' | 'advisor';
export type ChannelLevel = 'category' | 'object' | 'detail';
export type CompareMode = 'yoy' | 'mom';
export interface GridThresholds {
  x: number;
  cost: number;
  conversion: number;
  minContracts: number;
}
export interface GridCell {
  id: string;
  name: string;
  row: number;
  col: number;
  tone: 'good' | 'risk' | 'neutral';
  advice: string;
}
export interface GridPoint {
  name: string;
  group: string;
  x: number;
  y: number;
  cell: GridCell;
  dealCycle: number | null;
  current: Summary;
  previous: Summary;
  records: MarketingPerformanceMetric[];
}
export interface ExcludedPoint {
  name: string;
  group: string;
  reason: string;
}
export interface GridResult {
  points: GridPoint[];
  excluded: ExcludedPoint[];
  cells: GridCell[];
  previousPeriod: [string, string];
  total: number;
}
