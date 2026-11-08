import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { getDashboard } from '../api/dashboard';
import type { KpiDrillContext } from '../types/kpiDrilldown';
import type { DashboardFilter, KpiKey, MarketingPerformanceMetric } from '../types';
import { kpiDateRange } from '../utils/kpiDaily';
import { filterRows, summarize } from '../utils/metrics';
import { scopeCityFilter, updateScopedFilter } from '../utils/cityScope';
import type { ChannelRankingMetric } from '../utils/channelRanking';
export const defaultFilter = (): DashboardFilter => {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    periodType: 'month',
    periodAnchor: date.slice(0, 7),
    organization: '',
    region: '',
    city: '',
    project: '',
    metricDate: date,
    metricDateRange: [date.slice(0, 7) + '-01', date],
    organizationNames: [],
    organizationLabel: '招商蛇口',
    period: [date.slice(0, 7), date.slice(0, 7)],
    channel: '',
    channelObject: '',
    channelDetail: '',
    customer: '',
    basis: '签约口径',
  };
};
export const useDashboardStore = defineStore('dashboard', () => {
  const baseFilter = ref<DashboardFilter>(defaultFilter());
  const cityScope = ref('');
  const projectScope = ref('');
  const rows = shallowRef<MarketingPerformanceMetric[]>([]);
  const filter = computed({
    get: () => {
      const scoped = scopeCityFilter(baseFilter.value, cityScope.value);
      if (!projectScope.value) return scoped;
      const company =
        rows.value.find((row) => row.project === projectScope.value)?.organization ||
        cityScope.value;
      return {
        ...scoped,
        organization: company,
        organizationLabel: company || scoped.organizationLabel,
        organizationNames: [],
        region: '',
        city: '',
        project: projectScope.value,
      };
    },
    set: (next: DashboardFilter) => {
      baseFilter.value = updateScopedFilter(
        baseFilter.value,
        next,
        cityScope.value || projectScope.value,
      );
    },
  });
  const loading = ref(false);
  const error = ref('');
  const forbidden = ref(false);
  const updatedAt = ref('');
  const selectedKpi = ref('');
  const activeKpiTrend = ref('');
  const filtered = computed(() => filterRows(rows.value, filter.value));
  const summary = computed(() => summarize(filtered.value));
  const drawer = ref(false);
  const kpiDetailVisible = ref(false);
  const kpiDetailContext = shallowRef<KpiDrillContext | null>(null);
  const detailTitle = ref('');
  const detailChannel = ref('');
  const detailChannelMetric = ref<ChannelRankingMetric>('visitPeople');
  const detailRows = ref<MarketingPerformanceMetric[]>([]);
  function setCityScope(company: string) {
    if (cityScope.value === company) return;
    cityScope.value = company;
    activeKpiTrend.value = '';
    drawer.value = false;
    kpiDetailVisible.value = false;
  }
  function setProjectScope(project: string) {
    if (projectScope.value === project) return;
    projectScope.value = project;
    activeKpiTrend.value = '';
    drawer.value = false;
    kpiDetailVisible.value = false;
  }
  async function load() {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    forbidden.value = false;
    try {
      const data = await getDashboard();
      rows.value = data.rows;
      updatedAt.value = data.updatedAt;
    } catch (e) {
      forbidden.value = (e as { response?: { status: number } }).response?.status === 403;
      error.value = e instanceof Error ? e.message : '数据加载失败';
    } finally {
      loading.value = false;
    }
  }
  let filterRevision = 0;
  function applyFilter(next: DashboardFilter) {
    filterRevision++;
    activeKpiTrend.value = '';
    filter.value = JSON.parse(JSON.stringify(next));
  }
  async function query(next: DashboardFilter) {
    if (loading.value) return;
    const revision = filterRevision;
    await load();
    if (!error.value && revision === filterRevision) applyFilter(next);
  }
  function openKpiDetail(key: KpiKey, mode?: 'yesterday' | 'cumulative') {
    activeKpiTrend.value = '';
    selectedKpi.value = key;
    drawer.value = false;
    kpiDetailContext.value = {
      key,
      range: mode ? kpiDateRange(filter.value, mode) : undefined,
      filter: JSON.parse(JSON.stringify(filter.value)),
      rows: rows.value,
    };
    kpiDetailVisible.value = true;
  }
  function drill(
    title: string,
    records = filtered.value,
    channel = '',
    metric: ChannelRankingMetric = 'visitPeople',
  ) {
    kpiDetailVisible.value = false;
    detailTitle.value = title;
    detailChannel.value = channel;
    detailChannelMetric.value = metric;
    detailRows.value = records;
    drawer.value = true;
  }
  return {
    baseFilter,
    cityScope,
    setCityScope,
    projectScope,
    setProjectScope,
    filter,
    rows,
    filtered,
    summary,
    loading,
    error,
    forbidden,
    updatedAt,
    selectedKpi,
    activeKpiTrend,
    drawer,
    kpiDetailVisible,
    kpiDetailContext,
    openKpiDetail,
    detailTitle,
    detailChannel,
    detailChannelMetric,
    detailRows,
    load,
    query,
    applyFilter,
    drill,
  };
});
