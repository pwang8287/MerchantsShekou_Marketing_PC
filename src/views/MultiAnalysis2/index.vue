<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AdvisorNineGrid from './components/AdvisorNineGrid.vue';
import ProjectMarketingTable from '../MarketingAnalysis/components/ProjectMarketingTable.vue';
import { useDashboardStore } from '../../stores/dashboard';
import { splitAdvisorRecords } from '../../mocks/advisors';
import { filterRows, groupRows } from '../../utils/metrics';
import { channelCatalog } from '../../mocks/channels';
import { bubblePalette } from '../../charts/themes/bubbles';
import {
  projectSalesStatus,
  projectSalesStatuses,
  type ProjectSalesStatus,
} from '../../mocks/projectSalesStatus';
import type { BubbleSizeMetric } from '../../utils/dealCycle';
const store = useDashboardStore();
const selectedChannel = computed({
  get: () => store.filter.channel,
  set: (channel: string) =>
    store.applyFilter({ ...store.filter, channel, channelObject: '', channelDetail: '' }),
});
const mock = import.meta.env.VITE_USE_MOCK !== 'false';
const advisorRows = computed(() =>
  store.rows.some((row) => row.advisorId)
    ? store.rows
    : mock
      ? splitAdvisorRecords(store.rows)
      : [],
);
const cityTier = ref('全部');
const activeGroup = ref('');
const activeProject = ref('');
const search = ref('');
const size = ref<BubbleSizeMetric>('current');
const salesStatus = ref<'全部' | ProjectSalesStatus>('全部');
const cityTiers = ['全部', '一线城市', '新一线城市', '二线城市', '三四线城市'];
function tierForCity(city: string) {
  if (['北京', '上海', '广州', '深圳'].includes(city)) return '一线城市';
  if (
    [
      '成都',
      '重庆',
      '杭州',
      '南京',
      '苏州',
      '武汉',
      '西安',
      '天津',
      '郑州',
      '长沙',
      '东莞',
      '宁波',
      '青岛',
      '合肥',
      '佛山',
    ].includes(city)
  )
    return '新一线城市';
  if (
    [
      '济南',
      '珠海',
      '惠州',
      '中山',
      '昆明',
      '海口',
      '无锡',
      '福州',
      '厦门',
      '大连',
      '南宁',
    ].includes(city)
  )
    return '二线城市';
  return '三四线城市';
}
const cityColors = computed(() =>
  Object.fromEntries(
    [...new Set(store.rows.map((row) => row.city))]
      .sort()
      .map((city, i) => [city, bubblePalette[i % bubblePalette.length]]),
  ),
);
const color = (city: string) => cityColors.value[city] || '#4f8eff';
const tierRows = computed(() =>
  store.rows.filter(
    (row) =>
      (cityTier.value === '全部' || tierForCity(row.city) === cityTier.value) &&
      (salesStatus.value === '全部' || projectSalesStatus[row.project] === salesStatus.value),
  ),
);
const currentTierRows = computed(() => filterRows(tierRows.value, store.filter));
const groups = computed(() => [...new Set(currentTierRows.value.map((row) => row.city))]);
const projectCount = (city: string) =>
  new Set(currentTierRows.value.filter((row) => row.city === city).map((row) => row.project)).size;
const commonRows = computed(() =>
  tierRows.value.filter((row) => !activeGroup.value || row.city === activeGroup.value),
);
const allowedProjects = computed(() => [...new Set(commonRows.value.map((row) => row.project))]);
const commonAdvisorRows = computed(() =>
  advisorRows.value.filter((row) => allowedProjects.value.includes(row.project)),
);
const projectList = computed(() =>
  groupRows(filterRows(commonRows.value, store.filter), 'project')
    .filter((row) => row.name.toLowerCase().includes(search.value.trim().toLowerCase()))
    .map((row) => ({ name: row.name, city: row.records[0].city })),
);
const tableProjects = computed(() =>
  activeProject.value ? [activeProject.value] : allowedProjects.value,
);
function toggleGroup(city: string) {
  activeGroup.value = activeGroup.value === city ? '' : city;
}
function selectProject(project: string) {
  activeProject.value = activeProject.value === project ? '' : project;
}
watch([cityTier, salesStatus, () => store.filter], () => {
  activeGroup.value = '';
  activeProject.value = '';
});
watch(activeGroup, () => {
  activeProject.value = '';
});
</script>
<template>
  <section class="panel matrix-shared-filters">
    <div class="city-filter-bar">
      <span class="city-filter-label">城市群组</span>
      <div class="city-tier-selector" role="group" aria-label="城市群组">
        <button
          v-for="tier in cityTiers"
          :key="tier"
          :class="{ active: cityTier === tier }"
          :aria-pressed="cityTier === tier"
          @click="cityTier = tier"
        >
          {{ tier }}
        </button>
      </div>
      <div class="city-legend" aria-label="城市图例">
        <button
          class="all-cities"
          :class="{ active: !activeGroup }"
          @click="
            activeGroup = '';
            activeProject = '';
          "
        >
          全部城市
        </button>
        <button
          v-for="city in groups"
          :key="city"
          :class="{ muted: activeGroup && activeGroup !== city, active: activeGroup === city }"
          :aria-pressed="activeGroup === city"
          @click="toggleGroup(city)"
        >
          <i :style="{ background: color(city) }" />{{ city
          }}<small>（{{ projectCount(city) }}项目）</small>
        </button>
      </div>
    </div>
    <div class="matrix-toolbar">
      <div class="matrix-controls">
        <div class="project-stage-control">
          <span>项目阶段</span>
          <div class="matrix-segmented" role="group" aria-label="项目阶段">
            <button
              v-for="status in ['全部', ...projectSalesStatuses]"
              :key="status"
              :class="{ active: salesStatus === status }"
              :aria-pressed="salesStatus === status"
              @click="salesStatus = status as typeof salesStatus"
            >
              {{ status === '新开盘' ? '新盘' : status === '持续销售' ? '持销' : status }}
            </button>
          </div>
        </div>
        <div class="project-stage-control">
          <span>渠道</span>
          <div class="matrix-segmented" role="group" aria-label="选择渠道">
            <button
              :class="{ active: !selectedChannel }"
              :aria-pressed="!selectedChannel"
              @click="selectedChannel = ''"
            >
              全部
            </button>
            <button
              v-for="channel in channelCatalog"
              :key="channel.id"
              :class="{ active: selectedChannel === channel.name }"
              :aria-pressed="selectedChannel === channel.name"
              @click="selectedChannel = channel.name"
            >
              {{ channel.name }}
            </button>
          </div>
        </div>
        <span>气泡大小</span>
        <div class="matrix-segmented">
          <button :class="{ active: size === 'current' }" @click="size = 'current'">签约金额</button
          ><button :class="{ active: size === 'cycle' }" @click="size = 'cycle'">成交周期</button>
        </div>
      </div>
    </div>
  </section>
  <div class="shared-analysis-layout">
    <div class="shared-charts">
      <AdvisorNineGrid
        :rows="commonRows"
        dimension="project"
        :size="size"
        :selected-project="activeProject"
        :search="search"
        :city-colors="cityColors"
      />
      <AdvisorNineGrid
        :rows="commonAdvisorRows"
        :size="size"
        :selected-project="activeProject"
        :search="search"
        :city-colors="cityColors"
      />
    </div>
    <aside class="shared-project-sidebar panel">
      <div class="shared-project-search">
        <el-input
          v-model="search"
          clearable
          placeholder="请输入项目名称搜索"
          aria-label="搜索项目"
          size="small"
        />
        <div>
          <strong>共 {{ projectList.length }} 个项目</strong
          ><button v-if="activeProject" @click="activeProject = ''">清除选择</button>
        </div>
      </div>
      <ul class="shared-project-list">
        <li v-for="project in projectList" :key="project.name">
          <button
            :class="{ selected: activeProject === project.name }"
            :aria-pressed="activeProject === project.name"
            @click="selectProject(project.name)"
          >
            <i :style="{ background: color(project.city) }" /><span>{{ project.name }}</span>
          </button>
        </li>
        <li v-if="!projectList.length" class="shared-project-empty">暂无匹配项目</li>
      </ul>
    </aside>
  </div>
  <ProjectMarketingTable advisor-list :projects="tableProjects" />
</template>
<style scoped>
.matrix-shared-filters {
  padding: 18px 24px 0;
  margin-bottom: 18px;
}
.shared-analysis-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 18px;
  align-items: start;
}
.shared-charts {
  min-width: 0;
}
.shared-project-sidebar {
  position: static;
  overflow: hidden;
}
.shared-project-search {
  padding: 12px;
  border-bottom: 1px solid #edf1f7;
}
.shared-project-search > div:last-child {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}
.shared-project-search strong {
  font-size: 12px;
  color: #1677ff;
}
.shared-project-search button {
  border: 0;
  background: transparent;
  color: #1677ff;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.shared-project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 530px;
  overflow-y: auto;
}
.shared-project-list button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 0;
  border-bottom: 1px solid #eef2f7;
  padding: 12px;
  background: #fff;
  color: #536985;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.shared-project-list button.selected {
  background: #eff6ff;
  color: #1677ff;
  box-shadow: inset 3px 0 #1677ff;
}
.shared-project-list button:hover {
  background: #f7faff;
}
.shared-project-list i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.shared-project-list span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shared-project-empty {
  padding: 15px;
  font-size: 12px;
  color: #94a3b8;
}
@media (max-width: 900px) {
  .shared-analysis-layout {
    grid-template-columns: minmax(0, 1fr) 210px;
    gap: 12px;
  }
}
@media (max-width: 650px) {
  .shared-analysis-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .shared-project-sidebar {
    position: static;
    grid-row: 1;
    margin-bottom: 12px;
  }
  .shared-project-list {
    max-height: 180px;
  }
}
.matrix-toolbar {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}
.matrix-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  color: #738194;
  font-size: 12px;
}
.project-stage-control {
  display: flex;
  align-items: center;
  gap: 7px;
}
.project-stage-control > span {
  white-space: nowrap;
}
.matrix-controls > span {
  white-space: nowrap;
}
.matrix-segmented {
  display: inline-flex;
  border: 1px solid #dce5f2;
  border-radius: 5px;
  background: #fff;
  padding: 3px;
  gap: 2px;
}
.matrix-segmented button {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #738194;
  padding: 5px 9px;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}
.matrix-segmented button.active {
  background: #1677ff;
  color: #fff;
  font-weight: 600;
}
.city-filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 0 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid #edf1f7;
  flex-wrap: wrap;
  font-size: 12px;
}
.city-filter-label {
  color: #7b8aa3;
  white-space: nowrap;
}
.city-tier-selector {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border: 1px solid #dce5f2;
  border-radius: 6px;
}
.city-tier-selector button {
  padding: 7px 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #7b8aa3;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.city-tier-selector button.active {
  color: #fff;
  background: #3478f6;
  box-shadow: 0 2px 4px #3478f633;
}
.city-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}
.city-legend button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: #536985;
  padding: 7px 0;
  font: inherit;
  cursor: pointer;
}
.city-legend button.all-cities {
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
}
.city-legend button.all-cities.active {
  border-color: #dbe8ff;
  background: #f3f7ff;
  color: #1677ff;
}
.city-legend button.muted {
  opacity: 0.3;
}
.city-legend button.active {
  color: #1677ff;
}
.city-legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.city-legend small {
  font-size: 11px;
  color: #94a3b8;
}
.advisor-list i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
