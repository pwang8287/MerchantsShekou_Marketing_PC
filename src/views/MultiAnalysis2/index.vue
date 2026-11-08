<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import '../../styles/segmented-selector.css';
import AdvisorNineGrid from './components/AdvisorNineGrid.vue';
import ProjectMarketingTable from '../MarketingAnalysis/components/ProjectMarketingTable.vue';
import { useDashboardStore } from '../../stores/dashboard';
import { splitAdvisorRecords } from '../../mocks/advisors';
import { filterRows, groupRows } from '../../utils/metrics';
import { channelCatalog } from '../../mocks/channels';
import { conversionMatrixPalette } from '../../charts/themes/bubbles';
import {
  projectSalesStatus,
  projectSalesStatuses,
  type ProjectSalesStatus,
} from '../../mocks/projectSalesStatus';
import type { BubbleSizeMetric } from '../../utils/dealCycle';
const store = useDashboardStore();
const channelGroup = ref('全渠道');
const selectedChannel = ref('');
const onlineChannel = channelCatalog.find((channel) => channel.id === 'online')!;
const subChannels = computed(() =>
  channelGroup.value === '线上渠道'
    ? onlineChannel.objects.map((item) => ({ value: item.id, name: item.name }))
    : channelCatalog
        .filter((channel) => channel.id !== 'online')
        .map((item) => ({ value: item.name, name: item.name })),
);
const channelRows = computed(() =>
  store.rows.filter(
    (row) =>
      channelGroup.value === '全渠道' ||
      (channelGroup.value === '线上渠道'
        ? row.channel === onlineChannel.name
        : row.channel !== onlineChannel.name),
  ),
);
watch(
  channelGroup,
  () => {
    selectedChannel.value = '';
  },
  { flush: 'sync' },
);
const analysisFilter = computed(() => ({
  ...store.filter,
  channel:
    channelGroup.value === '线上渠道'
      ? onlineChannel.name
      : channelGroup.value === '线下渠道'
        ? selectedChannel.value
        : '',
  channelObject: channelGroup.value === '线上渠道' ? selectedChannel.value : '',
  channelDetail: '',
}));
const mock = import.meta.env.VITE_USE_MOCK !== 'false';
const advisorRows = computed(() =>
  channelRows.value.some((row) => row.advisorId)
    ? channelRows.value
    : mock
      ? splitAdvisorRecords(channelRows.value)
      : [],
);
const cityTier = ref('全部');
const activeGroup = ref('');
const activeProject = ref('');
const search = ref('');
const size = ref<BubbleSizeMetric | 'contracts'>('current');
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
      .map((city, i) => [city, conversionMatrixPalette[i % conversionMatrixPalette.length]]),
  ),
);
const color = (city: string) => cityColors.value[city] || conversionMatrixPalette[0];
const tierRows = computed(() =>
  channelRows.value.filter(
    (row) =>
      (cityTier.value === '全部' || tierForCity(row.city) === cityTier.value) &&
      (salesStatus.value === '全部' || projectSalesStatus[row.project] === salesStatus.value),
  ),
);
const currentTierRows = computed(() => filterRows(tierRows.value, analysisFilter.value));
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
  groupRows(filterRows(commonRows.value, analysisFilter.value), 'project')
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
watch([cityTier, salesStatus, analysisFilter], () => {
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
      <div class="city-tier-selector segmented-selector" role="group" aria-label="城市群组">
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
          :class="{
            'city-muted': activeGroup && activeGroup !== city,
            active: activeGroup === city,
          }"
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
          <span>气泡大小</span>
          <div class="matrix-segmented segmented-selector">
            <button :class="{ active: size === 'current' }" @click="size = 'current'">
              签约金额</button
            ><button :class="{ active: size === 'contracts' }" @click="size = 'contracts'">
              签约套数</button
            ><button :class="{ active: size === 'cycle' }" @click="size = 'cycle'">成交周期</button>
          </div>
        </div>
        <div class="project-stage-control filter-group-spaced">
          <span>项目阶段</span>
          <div class="matrix-segmented segmented-selector" role="group" aria-label="项目阶段">
            <button
              v-for="status in [
                '全部',
                ...projectSalesStatuses.filter((status) => status !== '未开盘'),
              ]"
              :key="status"
              :class="{ active: salesStatus === status }"
              :aria-pressed="salesStatus === status"
              @click="salesStatus = status as typeof salesStatus"
            >
              {{ status === '新开盘' ? '新盘' : status === '持续销售' ? '持销' : status }}
            </button>
          </div>
        </div>
        <div class="project-stage-control filter-group-spaced channel-filter-control">
          <span>渠道</span>
          <div class="channel-levels">
            <div class="matrix-segmented segmented-selector" role="group" aria-label="渠道分类">
              <button
                v-for="group in ['全渠道', '线下渠道', '线上渠道']"
                :key="group"
                :class="{ active: channelGroup === group }"
                :aria-pressed="channelGroup === group"
                @click="channelGroup = group"
              >
                {{ group }}
              </button>
            </div>
            <div
              v-if="channelGroup !== '全渠道'"
              class="matrix-segmented segmented-selector"
              role="group"
              aria-label="细分渠道"
            >
              <button
                :class="{ active: !selectedChannel }"
                :aria-pressed="!selectedChannel"
                @click="selectedChannel = ''"
              >
                全部
              </button>
              <button
                v-for="channel in subChannels"
                :key="channel.value"
                :class="{ active: selectedChannel === channel.value }"
                :aria-pressed="selectedChannel === channel.value"
                @click="selectedChannel = channel.value"
              >
                {{ channel.name }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <div class="shared-analysis-layout">
    <div class="shared-charts">
      <AdvisorNineGrid
        :rows="commonRows"
        dimension="project"
        :filter="analysisFilter"
        :size="size"
        :selected-project="activeProject"
        :search="search"
        :city-colors="cityColors"
      />
      <AdvisorNineGrid
        :rows="commonAdvisorRows"
        :filter="analysisFilter"
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
  <ProjectMarketingTable
    advisor-list
    :projects="tableProjects"
    :filter="analysisFilter"
    :rows="channelRows"
  />
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
  overflow-x: auto;
  padding-bottom: 3px;
}
.matrix-controls {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  color: #667380;
  font-size: 12px;
}
.project-stage-control {
  display: flex;
  align-items: center;
  gap: 7px;
}
.channel-filter-control {
  align-items: flex-start;
}
.channel-filter-control > span {
  line-height: 27px;
}
.channel-levels {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
}
.project-stage-control > span {
  flex-shrink: 0;
  width: 64px;
  white-space: nowrap;
}
.project-stage-control.filter-group-spaced > span {
  width: auto;
}
.filter-group-spaced {
  margin-left: 17px;
}
.matrix-controls > span {
  white-space: nowrap;
}
.city-filter-bar {
  display: flex;
  align-items: center;
  column-gap: 7px;
  row-gap: 12px;
  padding: 0 0 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid #edf1f7;
  flex-wrap: wrap;
  font-size: 12px;
}
.city-filter-label {
  flex-shrink: 0;
  width: 64px;
  color: #667380;
  white-space: nowrap;
}
.city-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-left: 9px;
}
.city-legend button {
  box-sizing: border-box;
  height: 27px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: #667380;
  padding: 0;
  font: inherit;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
}
.city-legend button.all-cities {
  box-sizing: border-box;
  height: 27px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 4px;
}
.matrix-shared-filters .segmented-selector > button:not(.active) {
  color: #667380;
}
.matrix-shared-filters .segmented-selector > button:not(.active):hover {
  color: #1c2b37;
}
.city-legend button.all-cities.active {
  border-color: #1677ff;
  background: #1677ff;
  color: #ffffff;
  font-weight: 600;
}
.city-legend button.city-muted {
  opacity: 0.3;
}
.city-legend button.active {
  color: #1677ff;
}
.city-legend button:not(.all-cities) {
  color: #1c2b37;
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  font-size: 11px;
  font-weight: 700;
}
.city-legend button:not(.all-cities).active {
  font-weight: 700;
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
