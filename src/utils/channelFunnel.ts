import type { MarketingPerformanceMetric } from '../types';

type Field = 'leads' | 'visits' | 'subscriptions' | 'contracts';
interface StageDefinition {
  name: string;
  from: Field;
  to?: Field;
  progress?: number;
}
const stage = (name: string, from: Field, to?: Field, progress?: number): StageDefinition => ({
  name,
  from,
  to,
  progress,
});
const closing = [stage('认购', 'subscriptions'), stage('签约', 'contracts')];
// 同一客户链路的演示节点；中间环节按每条事实插值，确保任意筛选及分组可加总。
const definitions: Record<string, StageDefinition[]> = {
  自然到访: [
    stage('咨询登记', 'leads'),
    stage('首次到访', 'visits'),
    stage('意向复访', 'visits', 'subscriptions', 0.55),
    ...closing,
  ],
  中介分销: [
    stage('客户报备', 'leads'),
    stage('有效判客', 'leads', 'visits', 0.28),
    stage('预约带看', 'leads', 'visits', 0.64),
    stage('带访确认', 'visits'),
    ...closing,
  ],
  自渠自拓: [
    stage('拓客留资', 'leads'),
    stage('有效联系', 'leads', 'visits', 0.32),
    stage('邀约确认', 'leads', 'visits', 0.7),
    stage('到访接待', 'visits'),
    ...closing,
  ],
  线上获客: [
    stage('线上留资', 'leads'),
    stage('有效联系', 'leads', 'visits', 0.35),
    stage('邀约看房', 'leads', 'visits', 0.72),
    stage('线下到访', 'visits'),
    ...closing,
  ],
  老带新: [
    stage('业主推荐', 'leads'),
    stage('推荐有效确认', 'leads', 'visits', 0.3),
    stage('邀约确认', 'leads', 'visits', 0.65),
    stage('推荐客户到访', 'visits'),
    ...closing,
  ],
  全面营销: [
    stage('推荐报备', 'leads'),
    stage('查重判客', 'leads', 'visits', 0.3),
    stage('邀约确认', 'leads', 'visits', 0.68),
    stage('客户到访', 'visits'),
    ...closing,
  ],
  其他: [
    stage('来源登记', 'leads'),
    stage('来源核实', 'leads', 'visits', 0.3),
    stage('有效跟进', 'leads', 'visits', 0.65),
    stage('到访接待', 'visits'),
    ...closing,
  ],
};
export function buildChannelFunnel(rows: MarketingPerformanceMetric[], channel: string) {
  const records = rows.filter((r) => r.channel === channel);
  const values = (definitions[channel] ?? definitions.其他).map((d) => ({
    name: d.name,
    simulated: Boolean(d.to),
    unit: d.from === 'contracts' ? '套' : '组',
    value: records.reduce(
      (sum, r) =>
        sum +
        (d.to ? r[d.from] - Math.round((r[d.from] - r[d.to]) * (d.progress ?? 0)) : r[d.from]),
      0,
    ),
  }));
  return values.map((item, i) => {
    const previous = i ? values[i - 1].value : 0;
    return {
      ...item,
      rate: i && previous ? (item.value / previous) * 100 : null,
      lost: i ? previous - item.value : null,
      cumulative: values[0].value ? (item.value / values[0].value) * 100 : null,
    };
  });
}
