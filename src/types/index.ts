export interface DashboardFilter {
  organization: string;
  region: string;
  city: string;
  project: string;
  period: [string, string];
  channel: string;
  channelObject?: string;
  channelDetail?: string;
  customer: string;
  basis: '签约口径' | '认购口径';
}
export interface MarketingPerformanceMetric {
  advisorId?: string;
  advisor?: string;
  id: string;
  organization: string;
  region: string;
  city: string;
  project: string;
  period: string;
  channel: string;
  channelObject: string;
  channelObjectId: string;
  channelDetail: string;
  channelDetailId: string;
  customer: string;
  property: string;
  area: string;
  target: number;
  amount: number;
  collection: number;
  leads: number;
  visits: number;
  subscriptions: number;
  contracts: number;
  fee: number;
}
export type KpiKey = 'amount' | 'contracts' | 'collection' | 'completion';
export interface KpiMetric {
  key: KpiKey;
  label: string;
  value: string;
  unit: string;
  yoy: number;
  mom: number;
  progress: number;
  note: string;
}
export interface TrendPoint {
  period: string;
  amount: number;
  collection: number;
  contracts: number;
  previous: number;
}
export interface RankingItem {
  name: string;
  value: number;
}
export interface MarketingMatrixCell {
  row: string;
  column: string;
  value: number;
  records: MarketingPerformanceMetric[];
}
export interface ConversionFunnelStage {
  name: string;
  value: number;
  rate: number;
}
export interface MarketingEfficiencyMetric {
  fee: number;
  leadCost: number;
  visitCost: number;
  acquisitionCost: number;
  roi: number;
}
export interface CustomerProfileMetric {
  name: string;
  value: number;
  amount: number;
  conversion: number;
}
export interface TableColumnConfig {
  prop: string;
  label: string;
  unit?: string;
  width?: number;
}
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
  updatedAt: string;
}
export type Dimension =
  | 'organization'
  | 'region'
  | 'city'
  | 'project'
  | 'channel'
  | 'channelObject'
  | 'channelDetail'
  | 'customer'
  | 'period';
export type MetricKey =
  | 'target'
  | 'amount'
  | 'contracts'
  | 'collection'
  | 'completion'
  | 'leads'
  | 'visits'
  | 'subscriptions'
  | 'conversion'
  | 'acquisition'
  | 'roi';
export interface MetricDefinition {
  label: string;
  unit: string;
  lowerBetter?: boolean;
}
export interface Summary {
  amount: number;
  target: number;
  collection: number;
  leads: number;
  visits: number;
  subscriptions: number;
  contracts: number;
  fee: number;
  completion: number;
  conversion: number;
  acquisition: number;
  roi: number;
}
export interface AggregateRow extends Summary {
  name: string;
  records: MarketingPerformanceMetric[];
}
