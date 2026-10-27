import { client } from './client';
import type { ApiResponse, MarketingPerformanceMetric } from '../types';
// 在此完成后端字段到展示模型的转换，金额统一转换为万元。
export function mapRecord(row: MarketingPerformanceMetric): MarketingPerformanceMetric {
  return {
    id: row.id,
    advisorId: row.advisorId,
    advisor: row.advisor,
    organization: row.organization,
    region: row.region,
    city: row.city,
    project: row.project,
    period: row.period,
    channel: row.channel,
    channelObject: row.channelObject || '未细分对象',
    channelObjectId: row.channelObjectId || `${row.channel}/${row.channelObject || '未细分对象'}`,
    channelDetail: row.channelDetail || '未细分触点',
    channelDetailId:
      row.channelDetailId ||
      `${row.channel}/${row.channelObject || '未细分对象'}/${row.channelDetail || '未细分触点'}`,
    customer: row.customer,
    property: row.property,
    area: row.area,
    target: Number(row.target),
    amount: Number(row.amount),
    collection: Number(row.collection),
    leads: Number(row.leads),
    visits: Number(row.visits),
    subscriptions: Number(row.subscriptions),
    contracts: Number(row.contracts),
    fee: Number(row.fee),
  };
}
export async function getDashboard() {
  const { data } =
    await client.get<ApiResponse<MarketingPerformanceMetric[]>>('/marketing/dashboard');
  if (data.code !== 0) throw new Error(data.message || '数据加载失败');
  if (!Array.isArray(data.data)) throw new Error('接口数据格式不正确');
  return { rows: data.data.map(mapRecord), updatedAt: data.updatedAt };
}
