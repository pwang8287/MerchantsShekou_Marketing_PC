<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Download, RefreshRight } from '@element-plus/icons-vue';
import { useDashboardStore } from '../stores/dashboard';
import GlobalFilters from '../components/filters/GlobalFilters.vue';
import DetailDrawer from '../components/common/DetailDrawer.vue';
import KpiDetailDrawer from '../components/dashboard/KpiDetailDrawer.vue';
import { exportCsv } from '../utils/export';
import { groupRows } from '../utils/metrics';
const store = useDashboardStore();
const route = useRoute();
watch(
  () => route.fullPath,
  () => {
    const company =
      route.name === 'city-marketing-detail'
        ? route.params.organization
        : route.name === 'project-marketing-detail'
          ? route.query.company
          : '';
    store.setCityScope(typeof company === 'string' ? company : '');
    const project = route.name === 'project-marketing-detail' ? route.params.project : '';
    store.setProjectScope(typeof project === 'string' ? project : '');
  },
  { immediate: true, flush: 'sync' },
);
const title = computed(() => String(route.meta.title || '营销分析'));
const online = ref(navigator.onLine);
const help = ref(false);
function connection() {
  online.value = navigator.onLine;
}
onMounted(() => {
  void store.load();
  window.addEventListener('online', connection);
  window.addEventListener('offline', connection);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', connection);
  window.removeEventListener('offline', connection);
});
function exportAll() {
  const rows = groupRows(store.filtered, 'project');
  exportCsv(
    '招商蛇口客户营销分析',
    [
      '项目',
      '目标金额（万元）',
      '签约金额（万元）',
      '回款金额（万元）',
      '签约套数',
      '目标完成率（%）',
    ],
    rows.map((r) => [
      r.name,
      r.target,
      r.amount,
      r.collection,
      r.contracts,
      r.completion.toFixed(1),
    ]),
  );
}
</script>
<template>
  <div class="app-shell">
    <header class="topbar">
      <router-link class="header-brand" to="/marketing-analysis" aria-label="营销力分析首页">
        <span class="brand-symbol" aria-hidden="true"
          ><svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 12h4l3-9 5 18 3-9h5" /></svg
        ></span>
        <strong>营销力分析</strong>
      </router-link>
      <nav class="page-tabs" aria-label="页面导航">
        <router-link
          to="/marketing-analysis"
          :class="{ 'router-link-active': route.path.startsWith('/marketing-analysis') }"
          >首页</router-link
        >
        <router-link to="/multi-analysis-2">多维分析</router-link>
      </nav>
      <div class="header-actions">
        <span class="header-updated"
          >数据更新时间 <b>{{ store.updatedAt.split(' ')[0] || '加载中' }}</b></span
        >
        <button
          class="header-help"
          aria-label="平台与数据口径"
          title="平台与数据口径"
          @click="help = true"
        >
          ?
        </button>
      </div>
    </header>
    <GlobalFilters
      ><template #actions>
        <el-button
          text
          :icon="RefreshRight"
          :loading="store.loading"
          aria-label="刷新数据"
          title="刷新数据"
          @click="store.load"
        />
        <el-button
          text
          :icon="Download"
          :disabled="!store.filtered.length"
          aria-label="导出报表"
          title="导出报表"
          @click="exportAll"
        /> </template
    ></GlobalFilters>
    <main class="dashboard-content" :aria-label="title">
      <el-alert
        v-if="!online"
        title="网络已断开，当前展示最近加载的数据。网络恢复后可刷新重试。"
        type="warning"
        :closable="false"
        show-icon
      />
      <div v-if="store.error" class="panel error-panel">
        <el-empty
          :description="store.forbidden ? '暂无访问权限，请联系管理员' : store.error"
        /><el-button type="primary" :loading="store.loading" @click="store.load">重试</el-button>
      </div>
      <template v-else
        ><el-skeleton v-if="store.loading && !store.rows.length" :rows="12" animated /><router-view
          v-else
      /></template>
      <footer class="page-footer">
        <span>招商蛇口 · 客户营销分析平台</span>
      </footer>
    </main>
    <KpiDetailDrawer v-if="store.kpiDetailContext" :context="store.kpiDetailContext" />
    <DetailDrawer /><el-dialog v-model="help" title="平台与数据口径" width="560px"
      ><p>招商蛇口客户营销分析 PC 端数据看板，覆盖营销经营、客户转化、营销效率与多维分析。</p>
      <el-descriptions :column="1" border
        ><el-descriptions-item label="数据来源"
          >本地确定性模拟数据，不代表真实经营情况</el-descriptions-item
        ><el-descriptions-item label="金额单位"
          >金额按万元或亿元展示；线索组数、到访人数与认购/签约套数分别统计</el-descriptions-item
        ><el-descriptions-item label="转化率">签约套数 / 线索组数</el-descriptions-item
        ><el-descriptions-item label="对比口径"
          >月、季、年按自然周期统计，当前周期截止当天；月度同比为上年同月对应进度，环比为上月对应进度；季度、年度卡片仅展示同比。自定义按所选起止日期统计。</el-descriptions-item
        ><el-descriptions-item label="可用期间"
          >2025 年 1 月至 2026 年 12
          月；默认范围为本月1日至机器当天，卡片累计为所选日期区间</el-descriptions-item
        ></el-descriptions
      ><template #footer><el-button @click="help = false">关闭</el-button></template></el-dialog
    >
  </div>
</template>
