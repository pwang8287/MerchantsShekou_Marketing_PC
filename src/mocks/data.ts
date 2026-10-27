import type { MarketingPerformanceMetric } from '../types';
import { channelCatalog, channelLeaves } from './channels';
import { allocateInteger } from './allocation';
// 确定性演示数据，非招商蛇口真实经营数据。期间：2025–2026 年；金额/费用：万元；客户：组；签约：套。
export const metadata = {
  source: '本地模拟数据',
  basis: '客户按项目、渠道、客户类型去重；跨项目可能重复',
  updatedAt: '2026-10-01 09:30',
  period: '2025-01 至 2026-12',
};
export const projects = [
  {
    name: '上海·招商时代乐章',
    region: '华东区域',
    city: '上海',
    organization: '上海公司',
    factor: 1.18,
  },
  {
    name: '上海·招商苏河玺',
    region: '华东区域',
    city: '上海',
    organization: '上海公司',
    factor: 1.32,
  },
  {
    name: '杭州·招商闻博花城',
    region: '华东区域',
    city: '杭州',
    organization: '杭州公司',
    factor: 0.96,
  },
  {
    name: '南京·招商江心印',
    region: '华东区域',
    city: '南京',
    organization: '南京公司',
    factor: 0.89,
  },
  {
    name: '深圳·招商玺家园',
    region: '华南区域',
    city: '深圳',
    organization: '深圳公司',
    factor: 1.42,
  },
  {
    name: '广州·招商臻园',
    region: '华南区域',
    city: '广州',
    organization: '广州公司',
    factor: 1.05,
  },
  {
    name: '成都·招商未来公园',
    region: '西南区域',
    city: '成都',
    organization: '成都公司',
    factor: 0.76,
  },
  {
    name: '重庆·招商渝天府',
    region: '西南区域',
    city: '重庆',
    organization: '重庆公司',
    factor: 0.68,
  },
];
export const channels = channelCatalog.map((c) => c.name);
export const customers = ['首置客群', '改善客群', '高端客群'];
export const records: MarketingPerformanceMetric[] = [];
for (const year of [2025, 2026])
  for (let month = 1; month <= 12; month++)
    projects.forEach((p, pi) =>
      channels.forEach((channel, ci) =>
        customers.forEach((customer, ti) => {
          const season = 0.84 + month * 0.025 + Math.sin(month + pi) * 0.13;
          const growth =
            year === 2026
              ? 1 +
                [-0.23, -0.1, 0.02, 0.17, 0.28, -0.05, 0.09, 0.21][pi] +
                [-0.12, 0.07, 0.2, -0.02, 0.04, 0.13, -0.08][ci]
              : 1;
          const costFactor =
            year === 2026
              ? 1 +
                [-0.1, 0.14, -0.02, -0.16, 0.12, 0.04, 0.18, -0.07][pi] +
                [-0.13, 0, 0.12, 0.05, -0.08, 0.08, -0.02][ci]
              : 1;
          const leads = Math.round((84 + pi * 7 + ci * 19 + ti * 11) * season * growth);
          const visits = Math.round(leads * (0.31 + ci * 0.025)),
            subscriptions = Math.round(visits * (0.23 + ti * 0.025)),
            contracts = Math.round(subscriptions * (0.75 + ci * 0.02));
          const amount = Math.round(contracts * (220 + ti * 90) * p.factor),
            target = Math.round((3300 + pi * 220 + ci * 450 + ti * 350) * p.factor),
            collection = Math.round(amount * (0.83 + ci * 0.018));
          const feeCents = Math.round(
            (leads * (ci === 0 ? 110 : 210 + ci * 65) * costFactor) / 100,
          );
          const period = `${year}-${String(month).padStart(2, '0')}`;
          const leaves = channelLeaves.filter((l) => l.channel === channel);
          // 子对象采用稳定但不同的年度份额；基础业绩只分配一次，不并存父级重复事实。
          const sales = leaves.map(
            (l, i) =>
              1 +
              ((i + pi + ti) % 4) * 0.2 +
              (year === 2026 ? [-0.35, 0.45, -0.1, 0.25][(l.objectIndex + pi) % 4] : 0),
          );
          const traffic = leaves.map(
            (l, i) =>
              1 +
              ((i + pi + ti) % 4) * 0.2 +
              (year === 2026 ? [0.35, -0.25, 0.2, -0.1][(l.objectIndex + pi) % 4] : 0),
          );
          const contractParts = allocateInteger(contracts, sales),
            extraSubs = allocateInteger(subscriptions - contracts, traffic),
            extraVisits = allocateInteger(visits - subscriptions, traffic),
            extraLeads = allocateInteger(leads - visits, traffic);
          const subscriptionParts = contractParts.map((v, i) => v + extraSubs[i]),
            visitParts = subscriptionParts.map((v, i) => v + extraVisits[i]),
            leadParts = visitParts.map((v, i) => v + extraLeads[i]);
          const moneyWeights = contractParts.some(Boolean) ? contractParts : sales;
          const amounts = allocateInteger(amount, moneyWeights),
            targets = allocateInteger(target, traffic),
            collections = allocateInteger(collection, moneyWeights),
            fees = allocateInteger(feeCents, traffic);
          leaves.forEach((leaf, i) =>
            records.push({
              id: `${period}-${pi}-${ci}-${ti}-${leaf.channelDetailId}`,
              organization: p.organization,
              region: p.region,
              city: p.city,
              project: p.name,
              period,
              channel,
              channelObject: leaf.channelObject,
              channelObjectId: leaf.channelObjectId,
              channelDetail: leaf.channelDetail,
              channelDetailId: leaf.channelDetailId,
              customer,
              property: ti === 2 ? '低密住宅' : '高层住宅',
              area: ['90㎡以下', '90–140㎡', '140㎡以上'][ti],
              leads: leadParts[i],
              visits: visitParts[i],
              subscriptions: subscriptionParts[i],
              contracts: contractParts[i],
              amount: amounts[i],
              target: targets[i],
              collection: collections[i],
              fee: fees[i] / 100,
            }),
          );
        }),
      ),
    );
