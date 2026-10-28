import type { DashboardFilter, KpiKey, MarketingPerformanceMetric, Summary } from './index';
export interface KpiDrillContext {
  key: KpiKey;
  filter: DashboardFilter;
  rows: MarketingPerformanceMetric[];
}
export type KpiDrillField = 'project' | 'channel' | 'channelObjectId' | 'channelDetailId';
export interface KpiDrillStep {
  field: KpiDrillField;
  id: string;
  label: string;
}
export interface KpiDrillLevel {
  field: KpiDrillField;
  label: string;
}
export interface KpiDrillColumn {
  key: string;
  label: string;
  unit: string;
  digits?: number;
}
export interface KpiDrillRow {
  id: string;
  name: string;
  values: Record<string, number | null>;
}
export interface KpiDrillView {
  current: Summary;
  prior: Summary;
  previous: Summary;
  currentRecords: MarketingPerformanceMetric[];
  priorRecords: MarketingPerformanceMetric[];
  previousRecords: MarketingPerformanceMetric[];
  priorPeriod: [string, string];
  previousPeriod: [string, string];
  children: KpiDrillRow[];
  totals: Record<string, number | null>;
  level?: KpiDrillLevel;
}
