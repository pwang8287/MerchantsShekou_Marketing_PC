<script setup lang="ts">
import ProjectBasicInfo from './components/ProjectBasicInfo.vue';
import KpiCards from '../../components/dashboard/KpiCards.vue';
import EfficiencySummary from './components/EfficiencySummary.vue';
import ConversionAnalysis from './components/ConversionAnalysis.vue';
import CityConversionComparison from './components/CityConversionComparison.vue';
import EfficiencyAnalysis from './components/EfficiencyAnalysis.vue';
import ProjectMarketingTable from './components/ProjectMarketingTable.vue';
</script>
<template>
  <div class="project-overview-layout">
    <ProjectBasicInfo />
    <div class="project-operating-overview">
      <KpiCards grouped />
      <EfficiencySummary />
    </div>
  </div>
  <ConversionAnalysis />
  <CityConversionComparison />
  <EfficiencyAnalysis />
  <ProjectMarketingTable />
</template>
<style scoped>
.project-overview-layout {
  display: grid;
  grid-template-columns: minmax(320px, 29%) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  align-items: stretch;
}
.project-operating-overview {
  min-width: 0;
}
.project-operating-overview :deep(.efficiency-summary) {
  margin-bottom: 0;
  padding: 12px;
}
.project-operating-overview :deep(.efficiency-grid) {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0;
}
.project-operating-overview :deep(.efficiency-card) {
  padding: 0 8px;
}
.project-operating-overview :deep(.efficiency-card:first-child) {
  padding-left: 0;
}
.project-operating-overview :deep(.efficiency-card + .efficiency-card) {
  border-left: 1px solid #edf1f5;
}
.project-operating-overview :deep(.efficiency-card > span) {
  font-size: 10px;
  white-space: nowrap;
}
.project-operating-overview :deep(.efficiency-card > strong) {
  font-size: 16px;
  margin-top: 5px;
  white-space: nowrap;
}
.project-operating-overview :deep(.efficiency-summary .panel-head) {
  margin-bottom: 12px;
}
@media (max-width: 1000px) {
  .project-overview-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 600px) {
  .project-operating-overview :deep(.kpi-grid) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
