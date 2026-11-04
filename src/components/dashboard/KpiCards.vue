<script setup lang="ts">
import KpiTrendPopover from './KpiTrendPopover.vue';
import ComparisonBadge from '../common/ComparisonBadge.vue';
import { statisticsPeriodPrefix } from '../../utils/statisticsPeriod';
import { useDashboard } from '../../composables/useDashboard';
import { User, Calendar, Collection, Histogram } from '@element-plus/icons-vue';
import type { KpiMetric } from '../../types';
import { fmt } from '../../utils/metrics';
import { kpiColor } from '../../utils/kpiColors';
withDefaults(defineProps<{ grouped?: boolean }>(), { grouped: false });
const { store, kpis } = useDashboard();
const icons = [User, Calendar, Collection, Histogram];
function cardProgress(k: KpiMetric) {
  if (k.key === 'leads')
    return { title: '线索有效率', value: k.leadValidityRate ?? null, note: k.leadValidityNote };
  if (k.key === 'visitPeople')
    return {
      title: k.conversionProgress?.title || '年度到访转认购率',
      value: k.conversionProgress ? k.conversionProgress.rate : (k.annualConversionRate ?? null),
      note: k.conversionProgress?.note || k.annualConversionNote,
    };
  if (k.targetProgress)
    return {
      title: k.targetProgress.title,
      value: k.targetProgress.rate,
      note: k.targetProgress.note,
    };
  return {
    title: k.annualGoalTitle,
    value: k.annualTarget ? k.progress : null,
    note: `年度累计 ${fmt(k.annualActual || 0, k.annualTargetUnit?.includes('元') ? 2 : 0)} ${k.annualTargetUnit} / 全年目标 ${fmt(k.annualTarget || 0, k.annualTargetUnit?.includes('元') ? 2 : 0)} ${k.annualTargetUnit}`,
  };
}
</script>
<template>
  <section :class="grouped ? 'panel kpi-metrics-panel' : 'kpi-metrics-default'">
    <header v-if="grouped" class="kpi-metrics-heading">
      <i></i>
      <h3>营销指标</h3>
    </header>
    <div class="kpi-grid" v-loading="store.loading">
      <article
        v-for="(k, i) in kpis"
        :key="k.key"
        class="kpi-card"
        :style="{ '--kpi-accent': kpiColor(k.key) }"
        :class="{ selected: store.selectedKpi === k.key }"
      >
        <div class="kpi-label">
          <span class="kpi-icon"
            ><el-icon><component :is="icons[i]" /></el-icon></span
          ><span>{{ k.label }}</span
          ><span class="kpi-info" :title="k.note">ⓘ</span>
        </div>
        <div class="kpi-value-pair">
          <div
            v-for="mode in ['yesterday', 'cumulative'] as const"
            :key="mode"
            class="kpi-data-group"
          >
            <div class="kpi-period-row">
              <span class="kpi-period"
                >{{ mode === 'yesterday' ? '昨日' : statisticsPeriodPrefix(store.filter.periodType)
                }}{{ k.label }}</span
              ><KpiTrendPopover
                v-if="['month', 'quarter', 'year'].includes(store.filter.periodType || '')"
                :metric="k"
                :mode="mode"
              />
            </div>
            <button
              class="kpi-data-button"
              :disabled="!store.filtered.length || !!store.error"
              @click="store.openKpiDetail(k.key, mode)"
            >
              <span class="kpi-value"
                >{{ store.filtered.length ? (mode === 'yesterday' ? k.yesterday : k.value) : '—'
                }}<small>{{ k.unit }}</small></span
              >
            </button>
            <div
              v-if="
                mode === 'cumulative' &&
                ['month', 'quarter', 'year'].includes(store.filter.periodType || '')
              "
              class="kpi-inline-comparisons"
              :class="{
                'period-comparison-left':
                  grouped || ['quarter', 'year'].includes(store.filter.periodType || ''),
              }"
            >
              <span>同比 <ComparisonBadge :value="k.yoy" /></span>
              <span v-if="!grouped && store.filter.periodType === 'month'"
                >环比 <ComparisonBadge :value="k.mom"
              /></span>
            </div>
          </div>
        </div>
        <div class="kpi-card-foot kpi-annual-goal" :title="cardProgress(k).note">
          <div class="kpi-annual-heading">
            <span>{{ cardProgress(k).title }}</span
            ><strong>{{
              cardProgress(k).value === null ? '—' : fmt(cardProgress(k).value!, 1) + '%'
            }}</strong>
          </div>
          <el-progress
            :percentage="Math.max(0, Math.min(cardProgress(k).value ?? 0, 100))"
            :show-text="false"
            :stroke-width="6"
            color="var(--kpi-accent)"
          />
        </div>
      </article>
    </div>
  </section>
</template>
<style scoped>
.kpi-metrics-panel {
  padding: 14px;
  margin-bottom: 16px;
}
.kpi-metrics-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e7edf5;
  margin-bottom: 12px;
}
.kpi-metrics-heading i {
  width: 4px;
  height: 17px;
  border-radius: 3px;
  background: #168bff;
}
.kpi-metrics-heading h3 {
  margin: 0;
  color: #243547;
  font-size: 15px;
}
.kpi-metrics-panel .kpi-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}
.kpi-metrics-panel .kpi-card {
  min-height: 132px;
  padding: 12px 8px;
  border: 0;
  border-radius: 7px;
  background: var(--kpi-tint);
  box-shadow: none;
}
.kpi-metrics-panel .kpi-card::before {
  display: none;
}
.kpi-metrics-panel .kpi-label {
  display: none;
}
.kpi-metrics-panel .kpi-value-pair {
  margin: 0;
  gap: 8px;
  padding-bottom: 22px;
}
.kpi-metrics-panel .kpi-data-group:first-child {
  padding-right: 8px;
  border-right: 1px solid #dfe6ef;
}
.kpi-metrics-panel .kpi-period {
  color: #243547;
  font-size: 10px;
  white-space: nowrap;
}
.kpi-metrics-panel .kpi-period-row {
  gap: 1px;
  margin-bottom: 7px;
}
.kpi-metrics-panel .kpi-value {
  font-size: 18px;
  line-height: 26px;
  gap: 2px;
}
.kpi-metrics-panel .kpi-value small {
  font-size: 10px;
}
.kpi-metrics-panel .kpi-annual-heading {
  font-size: 10px;
}
.kpi-metrics-panel .kpi-annual-heading strong {
  font-size: 11px;
}
.kpi-metrics-panel :deep(.kpi-trend-button) {
  width: 16px;
  height: 18px;
  flex-shrink: 0;
}
@media (max-width: 1250px) {
  .kpi-metrics-panel .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .kpi-metrics-panel .kpi-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.kpi-data-group {
  min-width: 0;
  position: relative;
}
.kpi-inline-comparisons {
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 7px;
  width: max-content;
  white-space: nowrap;
  color: #8a97aa;
  font-size: 10px;
  line-height: 16px;
}
.kpi-inline-comparisons > span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}
.kpi-inline-comparisons.period-comparison-left {
  left: 0;
  right: auto;
}
.kpi-inline-comparisons :deep(.comparison-badge) {
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}
.kpi-period-row {
  min-height: 22px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.kpi-period-row .kpi-period {
  margin: 0;
}
.kpi-data-button {
  display: block;
  border: 0;
  background: none;
  text-align: left;
  padding: 0;
  min-width: 0;
  width: 100%;
  border-radius: 4px;
}
.kpi-data-button:hover .kpi-value {
  filter: brightness(0.9);
}
.kpi-data-button:disabled {
  opacity: 0.5;
}
.kpi-data-button .kpi-period {
  display: block;
}
.kpi-annual-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #8a97aa;
  font-size: 11px;
  margin-bottom: 9px;
}
.kpi-annual-heading strong {
  color: var(--kpi-accent);
  font-size: 13px;
  font-weight: 600;
}
.kpi-annual-goal {
  width: 100%;
}
</style>
