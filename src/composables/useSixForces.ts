import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDashboardStore } from '../stores/dashboard';
import { filterRows } from '../utils/metrics';
import { buildSixForceProjects } from '../utils/sixForces';
export function useSixForces() {
  const store = useDashboardStore();
  const route = useRoute();
  const period = computed<[string, string]>(() =>
    route.query.scope === 'month'
      ? [store.filter.period[1], store.filter.period[1]]
      : store.filter.period,
  );
  // 对标池只受期间、渠道与客群影响；组织、区域、城市、项目是查看范围。
  const cohort = computed(() =>
    buildSixForceProjects(
      filterRows(
        store.rows,
        { ...store.filter, organization: '', region: '', city: '', project: '' },
        period.value,
      ),
    ),
  );
  const visibleNames = computed(
    () => new Set(filterRows(store.rows, store.filter, period.value).map((r) => r.project)),
  );
  const projects = computed(() => cohort.value.filter((p) => visibleNames.value.has(p.name)));
  const context = computed(() =>
    period.value[0] === period.value[1] ? period.value[0] : period.value.join(' 至 '),
  );
  return { cohort, projects, context, store };
}
