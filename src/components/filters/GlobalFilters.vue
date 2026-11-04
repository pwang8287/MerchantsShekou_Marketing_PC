<script setup lang="ts">
import { reactive, watch, computed, ref, nextTick } from 'vue';
import type { InputInstance } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import { Search, ArrowLeft } from '@element-plus/icons-vue';
import OrganizationSelector from './OrganizationSelector.vue';
import organizationTree from '../../mocks/organizationTree.json';
import { useDashboardStore, defaultFilter } from '../../stores/dashboard';
import type { DashboardFilter, StatisticsPeriodType } from '../../types';
import { machineDate, periodAnchor, resolveStatisticsPeriod } from '../../utils/statisticsPeriod';
import { selectOrganizationFilter } from '../../utils/organizationFilter';
const store = useDashboardStore();
const router = useRouter();
const route = useRoute();
const isProjectPage = computed(() => route.name === 'project-marketing-detail');
const projectSearch = ref('');
const projectSearchInput = ref<InputInstance>();
const projectOptions = computed(() => [...new Set(store.rows.map((row) => row.project))]);
const matchingProjects = computed(() =>
  projectOptions.value.filter((name) =>
    name.toLowerCase().includes(projectSearch.value.trim().toLowerCase()),
  ),
);
function projectDropdownVisible(visible: boolean) {
  projectSearch.value = '';
  if (visible) void nextTick(() => projectSearchInput.value?.focus());
}
function changeProject(project: string) {
  const company = store.rows.find((row) => row.project === project)?.organization;
  void router.push({
    name: 'project-marketing-detail',
    params: { project },
    query: { ...route.query, company: company || undefined },
  });
}
const draft = reactive<DashboardFilter>(JSON.parse(JSON.stringify(store.filter)));
watch(
  () => store.filter,
  (f) => Object.assign(draft, JSON.parse(JSON.stringify(f))),
  { deep: true },
);
const selectedOrganization = computed({
  get: () => draft.organizationLabel || draft.organization || organizationTree.name,
  set: (value: string) => {
    const next = selectOrganizationFilter(JSON.parse(JSON.stringify(draft)), value);
    Object.assign(draft, next);
    const marketingPage =
      route.path === '/marketing-analysis' || !!store.cityScope || !!store.projectScope;
    const company = marketingPage ? next.organization : '';
    store.setProjectScope('');
    store.setCityScope(company);
    store.applyFilter(next);
    if (marketingPage) {
      void router.push(
        company
          ? { name: 'city-marketing-detail', params: { organization: company } }
          : { path: '/marketing-analysis' },
      );
    }
  },
});
function clearExtraConditions() {
  Object.assign(draft, {
    region: '',
    city: '',
    project: '',
    channel: '',
    channelObject: '',
    channelDetail: '',
    customer: '',
  });
}
function syncPeriod() {
  Object.assign(draft, resolveStatisticsPeriod(draft));
}
function commitPeriod() {
  clearExtraConditions();
  syncPeriod();
  store.applyFilter(JSON.parse(JSON.stringify(draft)));
}
function changeType(type: StatisticsPeriodType) {
  const date = draft.metricDateRange?.[1] || machineDate();
  draft.periodType = type;
  if (type !== 'custom') draft.periodAnchor = periodAnchor(type, date);
  commitPeriod();
}
const quarterYear = computed({
  get: () => (draft.periodAnchor || machineDate()).slice(0, 4),
  set: (value: string) => {
    draft.periodAnchor = `${value}-Q${quarter.value}`;
    commitPeriod();
  },
});
const quarter = computed({
  get: () => Number(draft.periodAnchor?.slice(-1)) || 1,
  set: (value: number) => {
    draft.periodAnchor = `${quarterYear.value}-Q${value}`;
    commitPeriod();
  },
});
function apply() {
  clearExtraConditions();
  syncPeriod();
  void store.query(JSON.parse(JSON.stringify(draft)));
}
function reset() {
  Object.assign(draft, defaultFilter());
  apply();
}
</script>
<template>
  <section class="panel filter-panel">
    <el-form
      class="filter-form"
      :class="{ 'project-filter-form': isProjectPage }"
      label-position="left"
      :inline="true"
      @submit.prevent="apply"
    >
      <router-link v-if="isProjectPage" to="/marketing-analysis" class="project-return">
        <el-icon><ArrowLeft /></el-icon>返回首页
      </router-link>
      <OrganizationSelector v-else v-model="selectedOrganization" />
      <el-select
        v-if="isProjectPage"
        :model-value="store.projectScope"
        class="project-picker"
        aria-label="选择项目"
        popper-class="project-picker-dropdown"
        no-data-text="暂无匹配项目"
        @change="changeProject"
        @visible-change="projectDropdownVisible"
      >
        <template #header>
          <el-input
            ref="projectSearchInput"
            v-model="projectSearch"
            placeholder="搜索项目名称"
            aria-label="搜索项目名称"
            :prefix-icon="Search"
            clearable
            @keydown.stop
            @click.stop
          />
        </template>
        <el-option
          v-for="project in matchingProjects"
          :key="project"
          :label="project"
          :value="project"
        />
      </el-select>
      <el-form-item class="period-field" label="统计周期">
        <div class="statistics-controls" :title="draft.metricDateRange?.join(' 至 ')">
          <el-radio-group
            :model-value="draft.periodType || 'custom'"
            class="statistics-type-switch"
            aria-label="统计周期类型"
            @update:model-value="changeType"
          >
            <el-radio-button value="month">月</el-radio-button
            ><el-radio-button value="quarter">季</el-radio-button
            ><el-radio-button value="year">年</el-radio-button
            ><el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
          <el-date-picker
            v-if="draft.periodType === 'month'"
            v-model="draft.periodAnchor"
            type="month"
            format="YYYY年MM月"
            value-format="YYYY-MM"
            :clearable="false"
            style="width: 165px"
            aria-label="选择统计月份"
            @change="commitPeriod"
          />
          <template v-else-if="draft.periodType === 'quarter'"
            ><el-date-picker
              v-model="quarterYear"
              type="year"
              format="YYYY年"
              value-format="YYYY"
              :clearable="false"
              style="width: 125px"
              aria-label="选择季度年份" /><el-select
              v-model="quarter"
              style="width: 115px"
              aria-label="选择统计季度"
              ><el-option v-for="q in 4" :key="q" :label="`第${q}季度`" :value="q" /></el-select
          ></template>
          <el-date-picker
            v-else-if="draft.periodType === 'year'"
            v-model="draft.periodAnchor"
            type="year"
            format="YYYY年"
            value-format="YYYY"
            :clearable="false"
            style="width: 145px"
            aria-label="选择统计年份"
            @change="commitPeriod"
          />
          <el-date-picker
            v-else
            v-model="draft.metricDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            :clearable="false"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 285px"
            aria-label="自定义统计起止日期"
            @change="commitPeriod"
          />
        </div>
      </el-form-item>
      <div class="filter-actions">
        <el-button
          v-if="!route.path.startsWith('/marketing-analysis')"
          type="primary"
          :icon="Search"
          :loading="store.loading"
          native-type="submit"
          >查询</el-button
        ><el-button class="reset-button" :disabled="store.loading" @click="reset"
          >重置筛选</el-button
        >
      </div>
    </el-form>
  </section>
</template>
<style scoped>
.project-filter-form .project-return {
  display: inline-flex;
  align-items: center;
  align-self: stretch;
  gap: 8px;
  padding-right: 20px;
  border-right: 1px solid #e2e8f2;
  color: #64748b;
  font-size: 14px;
  white-space: nowrap;
  text-decoration: none;
}
.project-filter-form .project-picker {
  width: 240px;
  margin-left: auto;
  flex-shrink: 0;
}
.project-filter-form :deep(.project-picker .el-select__wrapper) {
  background: #eaf4ff;
  box-shadow: 0 0 0 1px #409eff inset;
}
.project-filter-form :deep(.project-picker .el-select__selected-item) {
  color: #168bff;
  font-weight: 600;
}
.statistics-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.statistics-type-switch {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 2px;
  padding: 3px;
  border-radius: 5px;
  background: #f1f5f9;
}
.statistics-type-switch :deep(.el-radio-button__inner) {
  border: 0 !important;
  border-radius: 4px !important;
  background: transparent;
  box-shadow: none !important;
  min-width: 42px;
  padding: 5px 12px;
  font-size: 12px;
  line-height: 16px;
  color: #64748b;
}
.statistics-type-switch :deep(.el-radio-button__inner:hover) {
  color: #168bff;
}
.statistics-type-switch :deep(.el-radio-button.is-active .el-radio-button__inner) {
  color: #168bff;
  background: #e3eeff;
  font-weight: 500;
}
</style>
<style>
.project-picker-dropdown .el-select-dropdown__header {
  padding: 8px;
  border-bottom: 1px solid #e2e8f2;
}
.project-picker-dropdown .el-input__wrapper {
  background: #f5f9fc;
  box-shadow: none;
  border-radius: 6px;
}
.project-picker-dropdown .el-input__inner {
  font-size: 13px;
  color: #43546e;
}
.project-picker-dropdown .el-select-dropdown__item {
  height: 36px;
  line-height: 36px;
  font-size: 13px;
}
</style>
