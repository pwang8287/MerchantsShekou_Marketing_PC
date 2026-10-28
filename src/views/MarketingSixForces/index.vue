<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../charts/components/BaseChart.vue';
import SixForceDiagnostics from './SixForceDiagnostics.vue';
import { useSixForces } from '../../composables/useSixForces';
import {
  forceDefinitions,
  healthStatus,
  healthClass,
  summarizeSixForces,
} from '../../utils/sixForces';
import type { SixForceProject } from '../../utils/sixForces';
import { fmt } from '../../utils/metrics';
import { exportCsv } from '../../utils/export';

const route = useRoute();
const router = useRouter();
const { cohort, projects, context, store } = useSixForces();
const region = computed(() => String(route.query.region || ''));
const city = computed(() => String(route.query.city || ''));
const scope = computed({
  get: () => (route.query.scope === 'month' ? 'month' : 'period'),
  set: (value: string) => {
    void router.replace({ query: { ...route.query, scope: value } });
  },
});
const search = ref('');
const status = ref('');
const page = ref(1);
const pageSize = ref(10);
const dimension = computed(() => (region.value ? 'city' : 'region'));
const scopedProjects = computed(() =>
  projects.value.filter(
    (p) => (!region.value || p.region === region.value) && (!city.value || p.city === city.value),
  ),
);
const summary = computed(() => summarizeSixForces(scopedProjects.value));
const baseline = computed(() => summarizeSixForces(cohort.value));
const groups = computed(() =>
  [...new Set(scopedProjects.value.map((p) => p[dimension.value]))]
    .map((name) => ({
      name,
      ...summarizeSixForces(scopedProjects.value.filter((p) => p[dimension.value] === name)),
    }))
    .sort((a, b) => b.total - a.total),
);
const list = computed(() =>
  scopedProjects.value.filter(
    (p) =>
      (!search.value || p.name.includes(search.value) || p.city.includes(search.value)) &&
      (!status.value ||
        (status.value === '预警能力' ? p.warningCount > 0 : p.status === status.value)),
  ),
);
const sorted = ref<{ prop: string; order: string | null }>({ prop: 'total', order: 'descending' });
const ordered = computed(() =>
  [...list.value].sort((a, b) => {
    const key = sorted.value.prop;
    const value = (p: SixForceProject) =>
      key.startsWith('force-')
        ? p.forces[Number(key.slice(6))].score
        : key === 'warningCount'
          ? p.warningCount
          : key === 'rank'
            ? p.rank
            : p.total;
    return (value(a) - value(b)) * (sorted.value.order === 'ascending' ? 1 : -1);
  }),
);
const paged = computed(() =>
  ordered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);
watch([list, pageSize], () => {
  page.value = 1;
});
watch(
  () => store.filter,
  () => {
    void router.replace({ query: { scope: scope.value } });
  },
  { deep: true },
);
function drill(name: string) {
  if (!region.value) void router.push({ query: { ...route.query, region: name, city: undefined } });
  else if (!city.value) void router.push({ query: { ...route.query, city: name } });
}
function up(level: 'head' | 'region') {
  void router.push({
    query: { ...route.query, region: level === 'head' ? undefined : region.value, city: undefined },
  });
}
function drillGroup(row: { name: string }) {
  drill(row.name);
}
function sortProjects(value: { prop: string; order: string | null }) {
  sorted.value = { prop: value.prop || 'total', order: value.order || 'descending' };
}
function openProject(project: SixForceProject) {
  void router.push({
    path: `/marketing-six-forces/project/${encodeURIComponent(project.name)}`,
    query: route.query,
  });
}
const radar = computed<EChartsOption>(() => ({
  color: ['#2873ed', '#a6b3c6'],
  tooltip: { trigger: 'item' },
  legend: {
    bottom: 0,
    data: ['当前范围中位数', '总部对标中位数'],
    textStyle: { color: '#71809a', fontSize: 11 },
  },
  radar: {
    radius: '64%',
    center: ['50%', '46%'],
    indicator: forceDefinitions.map((d) => ({ name: `${d.name}\n满分 ${d.max}`, max: d.max })),
    axisName: { color: '#536985', fontSize: 11, lineHeight: 20 },
    splitArea: { areaStyle: { color: ['#fff', '#f5f8fd'] } },
    splitLine: { lineStyle: { color: '#e7edf6' } },
    axisLine: { lineStyle: { color: '#e7edf6' } },
  },
  series: [
    {
      type: 'radar',
      symbolSize: 4,
      data: [
        {
          name: '当前范围中位数',
          value: summary.value.forces.map((f) => f.score),
          areaStyle: { opacity: 0.12 },
        },
        {
          name: '总部对标中位数',
          value: baseline.value.forces.map((f) => f.score),
          lineStyle: { type: 'dashed' },
          symbol: 'none',
        },
      ],
    },
  ],
}));
const comparison = computed<EChartsOption>(() => ({
  color: ['#2873ed'],
  tooltip: { trigger: 'axis', valueFormatter: (v) => `${fmt(Number(v), 1)} 分` },
  grid: { left: 70, right: 45, top: 15, bottom: 30 },
  xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: '#edf1f7' } } },
  yAxis: {
    type: 'category',
    inverse: true,
    data: groups.value.map((g) => g.name),
    axisTick: { show: false },
    axisLine: { show: false },
  },
  series: [
    {
      type: 'bar',
      barMaxWidth: 28,
      label: { show: true, position: 'right', formatter: (p) => fmt(Number(p.value), 1) },
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      data: groups.value.map((g) => ({ name: g.name, value: g.total })),
      markLine: {
        symbol: 'none',
        silent: true,
        label: { formatter: '总部中位数', position: 'insideEndTop', fontSize: 10 },
        lineStyle: { color: '#f0ad55', type: 'dashed' },
        data: [{ xAxis: baseline.value.total }],
      },
    },
  ],
}));
function exportProjects() {
  exportCsv(
    '项目营销六力明细',
    [
      '项目',
      '区域',
      '城市',
      '综合得分',
      '健康状态',
      '总部排名',
      ...forceDefinitions.map((d) => `${d.name}（${d.max}分）`),
      '预警能力数',
    ],
    ordered.value.map((p) => [
      p.name,
      p.region,
      p.city,
      fmt(p.total, 1),
      p.status,
      p.rank,
      ...p.forces.map((f) => fmt(f.score, 1)),
      p.warningCount,
    ]),
  );
}
</script>

<template>
  <div class="six-hierarchy">
    <header class="six-title">
      <div>
        <h2>营销六力分析</h2>
        <p>总部统览 · 区域对标 · 城市诊断 · 项目穿透</p>
      </div>
      <div class="six-title-tools">
        <el-tag type="info" effect="plain">模拟评分</el-tag
        ><el-radio-group v-model="scope" size="small"
          ><el-radio-button value="period">当前筛选期间</el-radio-button
          ><el-radio-button value="month">期末数据月</el-radio-button></el-radio-group
        >
      </div>
    </header>
    <div class="six-navigation">
      <el-breadcrumb separator="/"
        ><el-breadcrumb-item><button @click="up('head')">总部分析</button></el-breadcrumb-item
        ><el-breadcrumb-item v-if="region"
          ><button @click="up('region')">{{ region }}</button></el-breadcrumb-item
        ><el-breadcrumb-item v-if="city">{{ city }}</el-breadcrumb-item></el-breadcrumb
      ><span>{{ context }} · 当前筛选范围内 {{ summary.count }} 个项目</span>
    </div>
    <div class="six-summary-cards">
      <article>
        <span>项目综合得分中位数</span
        ><strong>{{ summary.count ? fmt(summary.total, 1) : '—' }}<small>/ 100分</small></strong>
        <p>总部对标中位数 {{ fmt(baseline.total, 1) }} 分</p>
      </article>
      <article>
        <span>纳入分析项目</span><strong>{{ summary.count }}<small>个</small></strong>
        <p>
          {{ new Set(scopedProjects.map((p) => p.city)).size }} 个城市 ·
          {{ new Set(scopedProjects.map((p) => p.region)).size }} 个区域
        </p>
      </article>
      <article>
        <span>综合优秀项目</span
        ><strong class="excellent">{{ summary.excellent }}<small>个</small></strong>
        <p>综合得分 ≥85 分</p>
      </article>
      <article>
        <span>存在能力预警的项目</span
        ><strong class="warning">{{ summary.warning }}<small>个</small></strong>
        <p>至少一项能力得分率低于 60%</p>
      </article>
    </div>
    <el-empty v-if="!summary.count" description="当前层级及筛选条件下暂无项目数据" />
    <template v-else>
      <div class="six-charts">
        <section class="panel six-block">
          <header class="panel-head">
            <div>
              <h3>六力能力画像</h3>
              <p>当前范围与总部对标 · 项目得分中位数</p>
            </div>
          </header>
          <BaseChart :option="radar" :height="340" unit="分" />
        </section>
        <section class="panel six-block">
          <header class="panel-head">
            <div>
              <h3>{{ region ? '城市' : '区域' }}综合得分对比</h3>
              <p>{{ city ? '当前城市项目中位数' : '点击柱形或下方层级表，逐层查看项目表现' }}</p>
            </div>
          </header>
          <BaseChart :option="comparison" :height="340" unit="分" @select="drill" />
        </section>
      </div>
      <div class="six-ability-cards">
        <article v-for="f in summary.forces" :key="f.id">
          <span>{{ f.name }}</span
          ><strong
            >{{ fmt(f.score, 1) }}<small>/ {{ f.max }}</small></strong
          ><el-progress
            :percentage="Math.round((f.score / f.max) * 100)"
            :show-text="false"
            :color="
              f.score / f.max >= 0.85 ? '#67af80' : f.score / f.max >= 0.6 ? '#e9ac55' : '#df7d82'
            "
          />
          <p>{{ f.warnings }} 个项目预警</p>
        </article>
      </div>
      <section class="panel six-block">
        <header class="panel-head">
          <div>
            <h3>{{ city ? '城市能力汇总' : region ? '城市能力对标' : '区域能力对标' }}</h3>
            <p>各项得分为所属项目对应得分的中位数，预警数按存在能力短板的项目统计</p>
          </div>
          <el-button v-if="region" text @click="up(city ? 'region' : 'head')">返回上一级</el-button>
        </header>
        <el-table :data="groups" @row-click="drillGroup"
          ><el-table-column :label="region ? '城市' : '区域'" min-width="120"
            ><template #default="{ row }"
              ><el-button link type="primary" @click.stop="drill(row.name)"
                >{{ row.name }}{{ !city ? ' →' : '' }}</el-button
              ></template
            ></el-table-column
          ><el-table-column prop="count" label="项目数" width="80" align="right" /><el-table-column
            label="综合中位数"
            width="100"
            align="right"
            ><template #default="{ row }"
              ><b>{{ fmt(row.total, 1) }}</b></template
            ></el-table-column
          ><el-table-column
            v-for="(d, i) in forceDefinitions"
            :key="d.id"
            :label="d.name"
            min-width="105"
            align="right"
            ><template #default="{ row }"
              ><span :class="healthClass(healthStatus(row.forces[i].score / d.max))">{{
                fmt(row.forces[i].score, 1)
              }}</span></template
            ></el-table-column
          ><el-table-column prop="warning" label="预警项目" width="95" align="right"
        /></el-table>
      </section>
    </template>
    <SixForceDiagnostics
      v-if="scopedProjects.length"
      :projects="scopedProjects"
      @select="openProject"
    />
    <section class="panel six-block six-project-details">
      <header class="panel-head">
        <div>
          <h3>项目营销六力数据明细</h3>
          <p>点击项目进入六力详情 · 排名为当前期间总部对标池排名（{{ cohort.length }} 个项目）</p>
        </div>
        <el-button :disabled="!ordered.length" @click="exportProjects">导出明细</el-button>
      </header>
      <div class="six-table-controls">
        <el-input
          v-model="search"
          clearable
          placeholder="搜索项目 / 城市"
          aria-label="搜索项目或城市"
        /><el-select v-model="status" clearable placeholder="全部健康状态" aria-label="健康状态"
          ><el-option
            v-for="s in ['优秀', '关注', '预警', '预警能力']"
            :key="s"
            :label="s === '预警能力' ? '存在预警能力' : s"
            :value="s" /></el-select
        ><span>共 {{ ordered.length }} 个项目</span>
      </div>
      <el-table
        :data="paged"
        :default-sort="{ prop: 'total', order: 'descending' }"
        @sort-change="sortProjects"
        @row-click="openProject"
        ><el-table-column prop="name" label="项目名称" min-width="215" fixed
          ><template #default="{ row }"
            ><el-button link type="primary" @click.stop="openProject(row)">{{
              row.name
            }}</el-button></template
          ></el-table-column
        ><el-table-column prop="region" label="区域" width="110" /><el-table-column
          prop="city"
          label="城市"
          width="80"
        /><el-table-column prop="total" label="综合得分" width="110" sortable="custom" align="right"
          ><template #default="{ row }"
            ><b>{{ fmt(row.total, 1) }}</b></template
          ></el-table-column
        ><el-table-column label="健康状态" width="90"
          ><template #default="{ row }"
            ><span class="six-status" :class="healthClass(row.status)">{{
              row.status
            }}</span></template
          ></el-table-column
        ><el-table-column
          prop="rank"
          label="总部排名"
          width="110"
          sortable="custom"
          align="right"
        /><el-table-column
          v-for="(d, i) in forceDefinitions"
          :key="d.id"
          :prop="`force-${i}`"
          :label="`${d.name} / ${d.max}`"
          min-width="150"
          sortable="custom"
          align="right"
          ><template #default="{ row }"
            ><span :class="healthClass(row.forces[i].status)">{{
              fmt(row.forces[i].score, 1)
            }}</span></template
          ></el-table-column
        ><el-table-column
          prop="warningCount"
          label="预警能力数"
          width="120"
          sortable="custom"
          align="right"
        /><el-table-column label="操作" width="100" fixed="right"
          ><template #default="{ row }"
            ><el-button link type="primary" @click.stop="openProject(row)"
              >查看详情 →</el-button
            ></template
          ></el-table-column
        ></el-table
      >
      <div class="six-pagination">
        <span>综合分 = 六项能力分之和 · 优秀 ≥85%，关注 60%–85%，预警 &lt;60%</span
        ><el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="ordered.length"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </section>
    <p class="six-footnote">
      评分说明：指标及目标值为模拟数据；项目各月指标等权汇总后计算能力得分，各层级直接取所属项目得分中位数，偶数项目取中间两项平均；综合分中位数独立计算，不等于各能力中位数之和，评分不随查看层级改变。总部对标池保留期间、渠道及客群筛选，排名以实际纳入项目数计算。
    </p>
  </div>
</template>

<style scoped>
.six-hierarchy {
  display: grid;
  gap: 20px;
}
.six-title,
.six-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.six-title h2 {
  font-size: 22px;
  margin: 0;
}
.six-title p,
.panel-head p {
  font-size: 12px;
  color: #8493aa;
  margin: 7px 0 0;
}
.six-title-tools {
  display: flex;
  gap: 12px;
  align-items: center;
}
.six-navigation {
  padding: 14px 18px;
  background: #edf4ff;
  border-radius: 8px;
}
.six-navigation button {
  border: 0;
  background: transparent;
  color: #2873ed;
  cursor: pointer;
  font: inherit;
}
.six-navigation > span {
  font-size: 12px;
  color: #71809a;
}
.six-summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.six-summary-cards article {
  padding: 22px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.six-summary-cards article > span {
  font-size: 13px;
  color: #71809a;
}
.six-summary-cards strong {
  display: block;
  font-size: 32px;
  margin: 14px 0;
  color: #213e68;
}
.six-summary-cards small,
.six-ability-cards small {
  font-size: 12px;
  font-weight: 400;
  color: #95a3b7;
  margin-left: 7px;
}
.six-summary-cards p,
.six-ability-cards p {
  font-size: 11px;
  color: #8a99ad;
  margin: 0;
}
.six-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.six-block {
  padding: 22px;
  min-width: 0;
}
.six-ability-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
}
.six-ability-cards article {
  padding: 18px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 9px;
}
.six-ability-cards article > span {
  font-size: 13px;
  color: #536985;
}
.six-ability-cards strong {
  display: block;
  font-size: 23px;
  margin: 12px 0;
}
.six-ability-cards p {
  margin-top: 10px;
}
.excellent {
  color: #4c9a66 !important;
}
.attention {
  color: #d49130;
}
.warning {
  color: #d86669 !important;
}
.six-status {
  padding: 4px 8px;
  border-radius: 4px;
  background: #f4f6f9;
  font-size: 12px;
}
.six-table-controls {
  display: flex;
  gap: 12px;
  margin: 18px 0;
  align-items: center;
}
.six-table-controls .el-input {
  width: 250px;
}
.six-table-controls .el-select {
  width: 180px;
}
.six-table-controls > span {
  margin-left: auto;
  font-size: 12px;
  color: #8a99ad;
}
.six-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
}
.six-pagination > span,
.six-footnote {
  font-size: 11px;
  line-height: 1.9;
  color: #8a99ad;
}
.six-footnote {
  margin: 0;
}
.six-project-details :deep(.el-table__row) {
  cursor: pointer;
}
@media (max-width: 1150px) {
  .six-ability-cards {
    grid-template-columns: repeat(3, 1fr);
  }
  .six-pagination {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 900px) {
  .six-charts {
    grid-template-columns: 1fr;
  }
  .six-summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .six-title,
  .six-navigation {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
