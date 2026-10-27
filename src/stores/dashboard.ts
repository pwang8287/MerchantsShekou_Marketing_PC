import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { getDashboard } from '../api/dashboard';
import type { DashboardFilter, MarketingPerformanceMetric } from '../types';
import { filterRows, summarize } from '../utils/metrics';
export const defaultFilter = (): DashboardFilter => ({
  organization: '',
  region: '',
  city: '',
  project: '',
  period: ['2026-01', '2026-09'],
  channel: '',
  channelObject: '',
  channelDetail: '',
  customer: '',
  basis: '签约口径',
});
export const useDashboardStore = defineStore('dashboard', () => {
  const filter = ref<DashboardFilter>(defaultFilter());
  const rows = shallowRef<MarketingPerformanceMetric[]>([]);
  const loading = ref(false);
  const error = ref('');
  const forbidden = ref(false);
  const updatedAt = ref('');
  const selectedKpi = ref('');
  const filtered = computed(() => filterRows(rows.value, filter.value));
  const summary = computed(() => summarize(filtered.value));
  const drawer = ref(false);
  const detailTitle = ref('');
  const detailRows = ref<MarketingPerformanceMetric[]>([]);
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
  async function query(next: DashboardFilter) {
    if (loading.value) return;
    await load();
    if (!error.value) filter.value = structuredClone(next);
  }
  function drill(title: string, records = filtered.value) {
    detailTitle.value = title;
    detailRows.value = records;
    drawer.value = true;
  }
  return {
    filter,
    rows,
    filtered,
    summary,
    loading,
    error,
    forbidden,
    updatedAt,
    selectedKpi,
    drawer,
    detailTitle,
    detailRows,
    load,
    query,
    drill,
  };
});
