<script setup lang="ts">
import { computed } from 'vue';
import ChartPanel from '../../../components/common/ChartPanel.vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { efficiencyOption, efficiencyPeriodTrendOption, barOption } from '../../../charts/options';
import { groupRows } from '../../../utils/metrics';
import { buildAdvisorDataRows } from '../../../utils/advisorData';
import { buildEfficiencyTrendData } from '../../../utils/efficiencyTrendData';
const store = useDashboardStore();
const advisorMode = computed(() => !!store.projectScope);
const ranking = computed(() =>
  barOption(
    advisorMode.value
      ? buildAdvisorDataRows(store.rows, store.filter)
      : groupRows(store.filtered, 'project'),
    'amount',
    false,
    advisorMode.value,
  ),
);
const option = computed(() => efficiencyOption(store.filtered));
const trendData = computed(() => buildEfficiencyTrendData(store.rows, store.filter));
const trend = computed(() => efficiencyPeriodTrendOption(trendData.value.points));
</script>
<template>
  <div class="chart-grid secondary-charts">
    <ChartPanel
      :title="advisorMode ? '顾问销售业绩排名' : '项目销售业绩排名'"
      :contextual-tooltip="!advisorMode"
      subtitle="签约金额 · 万元"
      :option="ranking"
      :height="270"
      unit="万元"
    />
    <ChartPanel
      title="营销费用与投入产出趋势"
      :subtitle="`${trendData.description} · ${trendData.start} 至 ${trendData.end}`"
      :option="trend"
      :filter="trendData.filter"
      :contextual-tooltip="false"
      :height="270"
      unit="万元 / 倍"
    /><ChartPanel
      title="渠道获客成本对比"
      subtitle="营销费用 / 签约套数，成本越低效率越高"
      :option="option"
      :height="270"
      unit="元/套"
    />
  </div>
</template>
