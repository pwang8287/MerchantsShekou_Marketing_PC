<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowDown, Download, RefreshRight, InfoFilled } from '@element-plus/icons-vue';
import { useDashboardStore } from '../stores/dashboard';
import GlobalFilters from '../components/filters/GlobalFilters.vue';
import DetailDrawer from '../components/common/DetailDrawer.vue';
import KpiDetailDrawer from '../components/dashboard/KpiDetailDrawer.vue';
import { exportCsv } from '../utils/export';
import { groupRows } from '../utils/metrics';
const store = useDashboardStore();
const route = useRoute();
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
      <div class="header-brand" aria-label="招商蛇口">
        <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
        <div><strong>招商蛇口</strong><small>CHINA MERCHANTS SHEKOU</small></div>
      </div>
      <nav class="page-tabs" aria-label="页面导航">
        <router-link to="/marketing-analysis">营销分析</router-link>
        <router-link to="/multi-analysis">多维分析</router-link>
        <router-link to="/multi-analysis-2">多维分析2</router-link>
      </nav>
      <div class="header-actions">
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
        />
        <el-dropdown @command="help = true">
          <button class="user-menu">
            <span>营销管理中心</span><el-icon><ArrowDown /></el-icon>
          </button>
          <template #dropdown
            ><el-dropdown-menu
              ><el-dropdown-item command="help">平台与数据口径</el-dropdown-item></el-dropdown-menu
            ></template
          >
        </el-dropdown>
      </div>
    </header>
    <main class="dashboard-content" :aria-label="title">
      <GlobalFilters /><el-alert
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
        <span>招商蛇口 · 客户营销分析平台</span
        ><span
          ><el-icon><InfoFilled /></el-icon> 本页面使用模拟数据，仅供产品演示</span
        >
      </footer>
    </main>
    <KpiDetailDrawer v-if="store.kpiDetailContext" :context="store.kpiDetailContext" />
    <DetailDrawer /><el-dialog v-model="help" title="平台与数据口径" width="560px"
      ><p>招商蛇口客户营销分析 PC 端数据看板，覆盖营销经营、客户转化、营销效率与多维分析。</p>
      <el-descriptions :column="1" border
        ><el-descriptions-item label="数据来源"
          >本地确定性模拟数据，不代表真实经营情况</el-descriptions-item
        ><el-descriptions-item label="金额单位">万元；指标卡展示为亿元</el-descriptions-item
        ><el-descriptions-item label="转化率">签约套数 / 线索组数</el-descriptions-item
        ><el-descriptions-item label="对比口径"
          >同比为上年同期间，环比为前一个等长期间；缺失时显示无可比数据</el-descriptions-item
        ><el-descriptions-item label="可用期间"
          >2025 年 1 月至 2026 年 12 月；默认展示 2026 年前三季度</el-descriptions-item
        ></el-descriptions
      ><template #footer><el-button @click="help = false">关闭</el-button></template></el-dialog
    >
  </div>
</template>
