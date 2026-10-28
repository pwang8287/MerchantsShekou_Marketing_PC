<script setup lang="ts">
import type { BubbleSizeMetric } from '../../utils/dealCycle';
defineProps<{ modelValue: BubbleSizeMetric; currentLabel: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: BubbleSizeMetric] }>();
function update(value: string | number | boolean | undefined) {
  if (value === 'current' || value === 'cycle') emit('update:modelValue', value);
}
</script>
<template>
  <div class="bubble-size-control">
    <span>气泡大小</span>
    <el-radio-group
      :model-value="modelValue"
      aria-label="气泡大小指标"
      @update:model-value="update"
    >
      <el-radio-button value="current" :title="currentLabel">{{ currentLabel }}</el-radio-button>
      <el-radio-button value="cycle" title="模拟成交周期，单位：天">成交周期</el-radio-button>
    </el-radio-group>
    <small v-if="modelValue === 'cycle'">模拟周期 · 天</small>
  </div>
</template>
<style scoped>
.bubble-size-control {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0 16px;
}
.bubble-size-control > span {
  font-size: 12px;
  color: #71809a;
}
.bubble-size-control > small {
  font-size: 11px;
  color: #8a99ad;
}
.bubble-size-control :deep(.el-radio-group) {
  --el-color-primary: #2d73f0;
  width: max-content;
  height: 24px;
  flex: 0 0 auto;
  flex-wrap: nowrap;
}
.bubble-size-control :deep(.el-radio-button) {
  width: auto;
  height: 24px;
  flex: 0 0 auto;
}
.bubble-size-control :deep(.el-radio-button__inner) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 24px;
  padding: 0 12px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border-color: #dfe7f1;
  color: #60646b;
  box-shadow: none;
}
.bubble-size-control :deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 5px 0 0 5px;
}
.bubble-size-control :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 5px 5px 0;
}
.bubble-size-control :deep(.el-radio-button.is-active .el-radio-button__inner) {
  color: #fff;
  background: #2d73f0;
  border-color: #2d73f0;
}
</style>
