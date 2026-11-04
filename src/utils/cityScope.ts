import type { DashboardFilter } from '../types';
export function scopeCityFilter(filter: DashboardFilter, company: string): DashboardFilter {
  if (!company) return filter;
  return {
    ...filter,
    organization: company,
    organizationLabel: company,
    organizationNames: [],
    region: '',
    city: '',
    project: '',
  };
}
// 城市页只改变查看范围；日期等公共条件同步保留，返回首页恢复原组织范围。
export function updateScopedFilter(
  base: DashboardFilter,
  next: DashboardFilter,
  company: string,
): DashboardFilter {
  if (!company) return next;
  return {
    ...next,
    organization: base.organization,
    organizationLabel: base.organizationLabel,
    organizationNames: base.organizationNames,
    region: base.region,
    city: base.city,
    project: base.project,
  };
}
