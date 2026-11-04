import organizationTree from '../mocks/organizationTree.json';
import type { DashboardFilter } from '../types';

export function selectOrganizationFilter(filter: DashboardFilter, name: string): DashboardFilter {
  const group = organizationTree.children.find((item) => item.name === name);
  return {
    ...filter,
    organizationLabel: name,
    organization: group || name === organizationTree.name ? '' : name,
    organizationNames: group ? [...group.children] : [],
    region: '',
    city: '',
    project: '',
    channel: '',
    channelObject: '',
    channelDetail: '',
    customer: '',
  };
}
