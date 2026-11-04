export const projectSalesStatuses = ['未开盘', '新开盘', '持续销售', '尾盘'] as const;
export type ProjectSalesStatus = (typeof projectSalesStatuses)[number];

// 项目销售状态为固定演示档案，切换统计周期时保持一致。
export const projectSalesStatus: Record<string, ProjectSalesStatus> = {
  '上海·招商时代乐章': '未开盘',
  '上海·招商苏河玺': '新开盘',
  '杭州·招商闻博花城': '持续销售',
  '南京·招商江心印': '尾盘',
  '深圳·招商玺家园': '新开盘',
  '广州·招商臻园': '持续销售',
  '成都·招商未来公园': '未开盘',
  '重庆·招商渝天府': '尾盘',
};
