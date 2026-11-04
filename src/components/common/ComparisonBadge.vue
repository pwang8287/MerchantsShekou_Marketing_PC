<script setup lang="ts">
import { computed } from 'vue';
import { comparisonState, type ComparisonUnit } from '../../utils/comparison';
const props = withDefaults(defineProps<{ value?: number | null; unit?: ComparisonUnit }>(), {
  unit: '%',
});
const state = computed(() => comparisonState(props.value, props.unit));
</script>
<template>
  <span
    class="comparison-badge"
    :class="'comparison-badge--' + state.tone"
    :title="state.missing ? '无可比数据' : undefined"
    >{{ state.text }}</span
  >
</template>
