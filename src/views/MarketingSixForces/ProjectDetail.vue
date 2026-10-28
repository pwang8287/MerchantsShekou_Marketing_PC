<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../charts/components/BaseChart.vue';
import { fmt } from '../../utils/metrics';
import { useSixForces } from '../../composables/useSixForces';
import { summarizeSixForces } from '../../utils/sixForces';
const route = useRoute();
const router = useRouter();
const { cohort, context } = useSixForces();
const project = computed(() => cohort.value.find((p) => p.name === String(route.params.project)));
const active = ref('');
const forces = computed(() => project.value?.forces ?? []);
const total = computed(() => project.value?.total ?? 0);
const hasData = computed(() => Boolean(project.value));
const rank = computed(() => project.value?.rank ?? 0);
const benchmarkMedian = computed(() => summarizeSixForces(cohort.value).total);
const strengths = computed(
  () =>
    forces.value
      .filter((d) => d.status === '优秀')
      .map((d) => d.name)
      .join('、') || '暂无优秀能力项',
);
const warnings = computed(
  () =>
    forces.value
      .filter((d) => d.status === '预警')
      .map((d) => d.name)
      .join('、') || '暂无预警能力项',
);
function back() {
  void router.push({ path: '/marketing-six-forces', query: route.query });
}
const radar = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  radar: {
    center: ['50%', '50%'],
    radius: '64%',
    splitNumber: 5,
    indicator: forces.value.map((d) => ({
      name: `${d.name}\n${fmt(d.score, 1)} / ${d.max}分`,
      max: d.max,
    })),
    axisName: { color: '#43546e', fontSize: 12, lineHeight: 22 },
    splitArea: { areaStyle: { color: ['#fffaf2', '#fff5e6', '#fff0da', '#ffebcd', '#ffe5bb'] } },
    splitLine: { lineStyle: { color: '#f3e6d2' } },
    axisLine: { lineStyle: { color: '#f3e6d2' } },
  },
  series: [
    {
      type: 'radar',
      name: '营销六力',
      data: [{ name: '当前能力得分', value: forces.value.map((d) => d.score) }],
      symbolSize: 6,
      lineStyle: { color: '#ed941d', width: 2 },
      itemStyle: { color: '#ed941d' },
      areaStyle: { color: '#f7b44b', opacity: 0.24 },
    },
  ],
}));
function jump(id: string) {
  active.value = id;
  document.getElementById(`force-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div class="six-forces-page">
    <div class="six-page-heading">
      <div>
        <el-button link type="primary" @click="back">← 返回分层分析</el-button>
        <h2>{{ route.params.project }} · 营销六力</h2>
        <p>{{ project?.region }} / {{ project?.city }} · 项目能力诊断</p>
      </div>
      <el-tag type="info" effect="plain">{{ context }} · 模拟评分</el-tag>
    </div>
    <el-empty v-if="!hasData" description="当前项目或筛选期间无数据，请返回分层分析选择项目" />
    <template v-else>
      <section class="six-overview">
        <div class="six-total">
          <span>综合得分</span><strong>{{ fmt(total, 1) }}<small>/ 100</small></strong
          ><span class="six-total-caption">营销能力综合诊断</span>
        </div>
        <div class="six-benchmark">
          <span>对标项目得分中位数</span><strong>{{ fmt(benchmarkMedian, 1) }}</strong
          ><span
            >对标项目排名 <b>{{ rank }}</b> / {{ cohort.length }}</span
          >
        </div>
        <div class="six-overview-copy">
          <span class="six-eyebrow">营销健康洞察</span>
          <h3>{{ total >= 70 ? '整体表现稳健，聚焦短板提升' : '关键能力待提升，建议重点跟进' }}</h3>
          <p>
            <b>{{ strengths }}</b
            >表现较好；建议优先关注<span>{{ warnings }}</span
            >，结合下方指标识别具体改进方向。
          </p>
          <small>诊断期间：{{ context }} · 评分、排名及指标值为演示模拟</small>
        </div>
      </section>
      <section class="panel six-health">
        <header class="panel-head">
          <div>
            <h3>健康诊察</h3>
            <p>六项能力独立评分，满分合计 100 分</p>
          </div>
          <div class="six-status-legend">
            <span class="excellent">优秀 ≥85%</span><span class="attention">关注 60%–85%</span
            ><span class="warning">预警 &lt;60%</span>
          </div>
        </header>
        <div class="six-health-body">
          <BaseChart :option="radar" :height="380" unit="分" />
          <div class="six-capability-list">
            <button v-for="d in forces" :key="d.id" @click="jump(d.id)">
              <span
                class="six-capability-icon"
                :class="{
                  excellent: d.status === '优秀',
                  attention: d.status === '关注',
                  warning: d.status === '预警',
                }"
                >{{ d.name.slice(0, 2) }}</span
              ><span class="six-capability-name"
                ><b>{{ d.name }}</b
                ><small>对标项目 {{ d.rank }} / {{ cohort.length }}</small></span
              ><span class="six-mini-progress"
                ><i
                  :style="{ width: `${d.ratio * 100}%` }"
                  :class="{
                    excellent: d.status === '优秀',
                    attention: d.status === '关注',
                    warning: d.status === '预警',
                  }"
                ></i></span
              ><strong
                >{{ fmt(d.score, 1) }}<small>/ {{ d.max }}</small></strong
              ><span
                class="six-badge"
                :class="{
                  excellent: d.status === '优秀',
                  attention: d.status === '关注',
                  warning: d.status === '预警',
                }"
                >{{ d.status }}</span
              ><span class="six-arrow">↗</span>
            </button>
          </div>
        </div>
      </section>
      <div class="six-section-heading">
        <h3>六力指标诊断</h3>
        <span>查看能力构成与指标表现 · 达标方向以各指标说明为准</span>
      </div>
      <div class="six-detail-grid">
        <section
          v-for="(d, index) in forces"
          :id="`force-${d.id}`"
          :key="d.id"
          class="panel six-force-card"
          :class="{ 'six-force-active': active === d.id }"
        >
          <header
            class="six-force-header"
            :class="{
              excellent: d.status === '优秀',
              attention: d.status === '关注',
              warning: d.status === '预警',
            }"
          >
            <div class="six-force-title">
              <span>0{{ index + 1 }}</span>
              <h3>{{ d.name }}</h3>
              <span
                class="six-badge"
                :class="{
                  excellent: d.status === '优秀',
                  attention: d.status === '关注',
                  warning: d.status === '预警',
                }"
                >{{ d.status }}</span
              >
            </div>
            <div class="six-force-numbers">
              <div>
                <small>能力得分</small
                ><strong
                  >{{ fmt(d.score, 1) }}<em>/ {{ d.max }}分</em></strong
                >
              </div>
              <div>
                <small>健康指数</small><strong>{{ fmt(d.ratio * 100, 0) }}<em>%</em></strong>
              </div>
              <div>
                <small>对标项目排名</small
                ><strong
                  >{{ d.rank }}<em>/ {{ cohort.length }}</em></strong
                >
              </div>
            </div>
            <p>{{ d.description }}</p>
          </header>
          <el-table :data="d.rows" size="small" class="six-indicator-table"
            ><el-table-column label="指标 / 健康度" min-width="180"
              ><template #default="{ row }"
                ><span
                  class="six-dot"
                  :class="{
                    excellent: row.status === '优秀',
                    attention: row.status === '关注',
                    warning: row.status === '预警',
                  }"
                ></span
                >{{ row.name
                }}<small class="six-metric-direction">{{
                  row.lower ? '越低越好' : '越高越好'
                }}</small></template
              ></el-table-column
            ><el-table-column label="实际 / 目标" min-width="125" align="right"
              ><template #default="{ row }"
                ><b>{{ fmt(row.actual, 1) }}{{ row.unit }}</b
                ><small class="six-metric-direction"
                  >目标 {{ row.target }}{{ row.unit }}</small
                ></template
              ></el-table-column
            ><el-table-column label="得分" min-width="75" align="right"
              ><template #default="{ row }"
                >{{ fmt(row.score, 1)
                }}<small class="six-metric-direction">/ {{ fmt(row.max, 1) }}</small></template
              ></el-table-column
            ><el-table-column label="排名" min-width="70" align="right"
              ><template #default="{ row }"
                >{{ row.rank
                }}<small class="six-metric-direction">/ {{ cohort.length }}</small></template
              ></el-table-column
            ></el-table
          >
          <footer class="six-force-footer">
            <span
              class="six-badge"
              :class="{
                excellent: d.status === '优秀',
                attention: d.status === '关注',
                warning: d.status === '预警',
              }"
              >{{ d.status }}</span
            ><span>{{
              d.status === '优秀'
                ? '保持当前优势，持续监测指标表现'
                : d.status === '关注'
                  ? '关注未达标指标，完善专项提升动作'
                  : '优先诊断薄弱环节，制定改进计划'
            }}</span>
          </footer>
        </section>
      </div>
      <p class="six-data-note">
        数据说明：本页参考“营销六力”示意图生成，能力权重分别为 15、20、10、20、25、10
        分。当前评分与上级项目表使用同一数据；排名依据相同期间、渠道及客群下的全部可比项目计算。指标值为模拟数据，能力得分为指标得分之和，综合得分为六力得分之和。
      </p>
    </template>
  </div>
</template>

<style scoped>
.six-forces-page {
  display: grid;
  gap: 20px;
}
.six-page-heading,
.six-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
h2 {
  margin: 0;
  font-size: 22px;
  color: #14243d;
}
.six-page-heading p {
  margin: 8px 0 0;
  color: #71809a;
  font-size: 13px;
}
.six-period {
  display: flex;
  align-items: center;
  gap: 12px;
}
.six-overview {
  display: grid;
  grid-template-columns: 190px 210px 1fr;
  align-items: center;
  background: linear-gradient(115deg, #eaf2ff, #f5f9ff);
  border: 1px solid #dce8fa;
  border-radius: 12px;
  padding: 28px 30px;
  gap: 30px;
}
.six-total,
.six-benchmark {
  display: grid;
  gap: 12px;
  font-size: 13px;
  color: #536985;
}
.six-total > strong {
  color: #ef931b;
  font-size: 46px;
  line-height: 1.1;
  font-weight: 700;
}
.six-total strong small {
  font-size: 16px;
  color: #9aa9bf;
  font-weight: 400;
  margin-left: 8px;
}
.six-total-caption {
  font-size: 12px;
}
.six-benchmark {
  border-right: 1px solid #d6e3f5;
}
.six-benchmark > strong {
  font-size: 28px;
  color: #294b78;
}
.six-benchmark b {
  color: #2873ed;
  font-size: 17px;
  margin-left: 10px;
}
.six-eyebrow {
  color: #2873ed;
  font-size: 12px;
}
.six-overview-copy h3 {
  margin: 8px 0;
  font-size: 18px;
}
.six-overview-copy p {
  color: #536985;
  line-height: 1.8;
  font-size: 13px;
  margin: 0 0 8px;
}
.six-overview-copy p b {
  color: #4c9c71;
  font-weight: 500;
}
.six-overview-copy p span {
  color: #df7752;
}
.six-overview-copy small {
  color: #8998ac;
  font-size: 11px;
}
.six-health {
  padding: 22px 26px;
}
.panel-head p {
  margin: 6px 0 0;
  color: #8a99ae;
  font-size: 12px;
}
.six-status-legend {
  display: flex;
  gap: 16px;
  font-size: 11px;
}
.six-status-legend span {
  background: transparent !important;
}
.six-health-body {
  display: grid;
  grid-template-columns: minmax(350px, 0.95fr) minmax(520px, 1.2fr);
  gap: 40px;
  align-items: center;
}
.six-capability-list {
  display: grid;
  gap: 8px;
}
.six-capability-list button {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  color: #14243d;
}
.six-capability-list button:hover {
  background: #f8fbff;
  border-color: #c8dbfa;
}
.six-capability-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  font-size: 12px;
  flex-shrink: 0;
}
.six-capability-name {
  min-width: 100px;
  display: grid;
  gap: 5px;
}
.six-capability-name b {
  font-size: 13px;
  font-weight: 500;
}
.six-capability-name small {
  font-size: 10px;
  color: #8a99ae;
}
.six-mini-progress {
  flex: 1;
  background: #f0f3f8;
  height: 5px;
  border-radius: 5px;
  overflow: hidden;
}
.six-mini-progress i {
  display: block;
  height: 100%;
  border-radius: 5px;
}
.six-mini-progress i.excellent {
  background: #67af80;
}
.six-mini-progress i.attention {
  background: #efac50;
}
.six-mini-progress i.warning {
  background: #e57779;
}
.six-capability-list strong {
  font-size: 17px;
  min-width: 78px;
  text-align: right;
}
.six-capability-list strong small {
  font-size: 11px;
  color: #98a6b9;
  font-weight: 400;
}
.six-arrow {
  color: #9aa9bd;
}
.six-badge {
  display: inline-block;
  border-radius: 4px;
  padding: 3px 7px;
  font-size: 11px;
  white-space: nowrap;
}
.excellent {
  color: #4c9a66;
  background: #eaf6e9;
}
.attention {
  color: #dd922c;
  background: #fff3df;
}
.warning {
  color: #d86669;
  background: #fbeaec;
}
.six-section-heading h3 {
  margin: 4px 0;
  font-size: 17px;
}
.six-section-heading span {
  color: #8a99ae;
  font-size: 12px;
}
.six-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
}
.six-force-card {
  overflow: hidden;
  scroll-margin-top: 100px;
}
.six-force-active {
  border-color: #7aabf5;
  box-shadow: 0 0 0 2px #2873ed14;
}
.six-force-header {
  padding: 22px 24px 18px;
}
.six-force-header.excellent {
  background: #f0f7ec;
}
.six-force-header.attention {
  background: #fcf5e9;
}
.six-force-header.warning {
  background: #fcf0f1;
}
.six-force-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.six-force-title > span:first-child {
  opacity: 0.5;
  font-size: 13px;
}
.six-force-title h3 {
  margin: 0;
  color: #14243d;
  font-size: 17px;
}
.six-force-title .six-badge {
  margin-left: auto;
  background: #fff9;
}
.six-force-numbers {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  margin-top: 24px;
  gap: 18px;
}
.six-force-numbers div {
  display: grid;
  gap: 8px;
}
.six-force-numbers small {
  color: #71809a;
  font-size: 11px;
}
.six-force-numbers strong {
  font-size: 24px;
}
.six-force-numbers em {
  font-size: 12px;
  color: #8c9aad;
  font-style: normal;
  margin-left: 5px;
  font-weight: 400;
}
.six-force-header p {
  color: #61718a;
  font-size: 12px;
  line-height: 1.8;
  margin: 18px 0 0;
}
.six-indicator-table {
  width: calc(100% - 40px);
  margin: 6px 20px;
}
.six-metric-direction {
  display: block;
  color: #9aa8ba;
  font-size: 10px;
  font-weight: 400;
  line-height: 1.6;
}
.six-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 7px;
}
.six-dot.excellent {
  background: #67af80;
}
.six-dot.attention {
  background: #efac50;
}
.six-dot.warning {
  background: #e57779;
}
.six-force-footer {
  margin: 14px 20px 20px;
  padding: 12px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: #71809a;
}
.six-data-note {
  color: #8b99ac;
  font-size: 12px;
  line-height: 1.9;
  margin: 0;
}
@media (max-width: 1250px) {
  .six-health-body {
    gap: 12px;
    grid-template-columns: minmax(330px, 1fr) minmax(420px, 1.2fr);
  }
  .six-capability-list button {
    gap: 9px;
  }
  .six-overview {
    grid-template-columns: 150px 170px 1fr;
    gap: 20px;
  }
  .six-mini-progress {
    display: none;
  }
}
@media (max-width: 960px) {
  .six-health-body,
  .six-detail-grid {
    grid-template-columns: 1fr;
  }
  .six-overview {
    grid-template-columns: 1fr 1fr;
  }
  .six-overview-copy {
    grid-column: 1/-1;
  }
  .six-benchmark {
    border: 0;
  }
  .six-page-heading {
    align-items: flex-start;
  }
  .six-period {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .six-status-legend {
    gap: 8px;
  }
}
</style>
