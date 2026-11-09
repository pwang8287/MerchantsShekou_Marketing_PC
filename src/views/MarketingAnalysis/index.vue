<script setup lang="ts">
import KpiCards from '../../components/dashboard/KpiCards.vue';
import CityConversionComparison from './components/CityConversionComparison.vue';
import ConversionAnalysis from './components/ConversionAnalysis.vue';
import PropertyDistributionAnalysis from './components/PropertyDistributionAnalysis.vue';
import EfficiencySummary from './components/EfficiencySummary.vue';
import ProjectMarketingTable from './components/ProjectMarketingTable.vue';
</script>
<template>
  <KpiCards />
  <EfficiencySummary />
  <ConversionAnalysis />
  <CityConversionComparison />
  <PropertyDistributionAnalysis />
  <ProjectMarketingTable />
</template>
