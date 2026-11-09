<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { InputInstance } from 'element-plus';
import { OfficeBuilding, ArrowDown, ArrowRight, Check, Search } from '@element-plus/icons-vue';
import organizationTree from '../../mocks/organizationTree.json';
defineProps<{ modelValue: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const visible = ref(false);
const expanded = ref<string[]>(['南部城市群']);
const search = ref('');
const searchInput = ref<InputInstance>();
const keyword = computed(() => search.value.trim().toLowerCase());
const rootMatches = computed(() => organizationTree.name.toLowerCase().includes(keyword.value));
const matchingGroups = computed(() =>
  organizationTree.children
    .map((group) => ({
      ...group,
      children:
        !keyword.value || rootMatches.value || group.name.toLowerCase().includes(keyword.value)
          ? group.children
          : group.children.filter((company) => company.toLowerCase().includes(keyword.value)),
    }))
    .filter((group) => group.children.length),
);
watch(visible, async (open) => {
  if (open) {
    search.value = '';
    await nextTick();
    searchInput.value?.focus();
  }
});
function toggle(name: string) {
  expanded.value = expanded.value.includes(name)
    ? expanded.value.filter((v) => v !== name)
    : [...expanded.value, name];
}
function choose(name: string) {
  emit('update:modelValue', name);
  visible.value = false;
}
</script>
<template>
  <el-popover
    v-model:visible="visible"
    :disabled="disabled"
    trigger="click"
    placement="bottom-start"
    :width="360"
    popper-class="organization-menu"
    :show-arrow="false"
    :offset="8"
  >
    <template #reference
      ><button
        type="button"
        :disabled="disabled"
        class="organization-trigger"
        :class="{ open: visible }"
        aria-label="选择组织范围"
        :aria-expanded="visible"
      >
        <el-icon><OfficeBuilding /></el-icon><span>{{ modelValue || organizationTree.name }}</span
        ><el-icon class="organization-caret"><ArrowDown /></el-icon></button
    ></template>
    <div class="organization-search">
      <el-input
        ref="searchInput"
        v-model="search"
        class="app-search-input"
        placeholder="搜索城市群或城市公司"
        aria-label="搜索组织"
        :prefix-icon="Search"
        clearable
        @keydown.stop
      />
    </div>
    <el-scrollbar max-height="400px">
      <button
        v-if="!keyword || rootMatches"
        type="button"
        class="organization-option organization-root"
        :class="{ selected: !modelValue || modelValue === organizationTree.name }"
        @click="choose(organizationTree.name)"
      >
        <el-icon><OfficeBuilding /></el-icon><span>{{ organizationTree.name }}</span
        ><el-icon
          v-if="!modelValue || modelValue === organizationTree.name"
          class="organization-check"
          ><Check
        /></el-icon>
      </button>
      <section v-for="group in matchingGroups" :key="group.name">
        <div class="organization-group-row">
          <button
            type="button"
            class="organization-option organization-group"
            :class="{ selected: modelValue === group.name }"
            @click="choose(group.name)"
          >
            <i></i><span>{{ group.name }}</span
            ><el-icon v-if="modelValue === group.name" class="organization-check"
              ><Check
            /></el-icon></button
          ><button
            v-if="!keyword"
            type="button"
            class="organization-expand"
            :aria-label="(expanded.includes(group.name) ? '收起' : '展开') + group.name"
            :aria-expanded="expanded.includes(group.name)"
            @click="toggle(group.name)"
          >
            <el-icon
              ><ArrowDown v-if="expanded.includes(group.name)" /><ArrowRight v-else
            /></el-icon>
          </button>
        </div>
        <div v-if="keyword || expanded.includes(group.name)">
          <button
            v-for="company in group.children"
            :key="company"
            type="button"
            class="organization-option organization-company"
            :class="{ selected: modelValue === company }"
            @click="choose(company)"
          >
            <el-icon><OfficeBuilding /></el-icon><span>{{ company }}</span
            ><el-icon v-if="modelValue === company" class="organization-check"><Check /></el-icon>
          </button>
        </div>
      </section>
      <el-empty
        v-if="!matchingGroups.length && !rootMatches"
        :image-size="42"
        description="暂无匹配组织"
      />
    </el-scrollbar>
  </el-popover>
</template>
<style scoped>
.organization-search {
  padding: 10px;
  border-bottom: 1px solid #e2e8f2;
}
.organization-search :deep(.el-input__wrapper) {
  background: #f5f9fc;
  border-radius: 6px;
}
.organization-trigger {
  height: 36px;
  box-sizing: border-box;
  min-width: 196px;
  padding: 0 14px;
  border: 1px solid #86a9f6;
  border-radius: 6px;
  background: #f3f7ff;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #4f78c9;
  font-size: 14px;
  font-weight: 600;
}
.organization-trigger:hover,
.organization-trigger.open {
  border-color: #5484f5;
  background: #f3f7ff;
}
.organization-trigger > .el-icon {
  font-size: 17px;
}
.organization-caret {
  margin-left: auto;
  font-size: 12px !important;
}
.organization-option {
  display: flex;
  align-items: center;
  gap: 13px;
  border: 0;
  background: #fff;
  width: 100%;
  padding: 13px 20px;
  color: #4a5e7a;
  font-size: 15px;
  text-align: left;
  min-height: 46px;
}
.organization-option:hover {
  background: #f7faff;
}
.organization-option.selected {
  background: #f0f5ff;
  color: #4879d1;
  font-weight: 600;
}
.organization-option > .el-icon {
  color: #9aacc7;
  font-size: 16px;
  flex-shrink: 0;
}
.organization-root > .el-icon {
  color: #5484ed;
}
.organization-check {
  margin-left: auto;
  color: #5484ed !important;
}
.organization-group-row {
  display: flex;
}
.organization-group {
  padding-left: 18px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}
.organization-group i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #9aaac2;
  margin-right: 2px;
}
.organization-expand {
  width: 42px;
  flex-shrink: 0;
  border: 0;
  background: white;
  color: #536985;
}
.organization-expand:hover {
  background: #f2f6fd;
}
.organization-company {
  padding-left: 51px;
  font-weight: 400;
  font-size: 14px;
}
</style>
<style>
.el-popover.el-popper.organization-menu {
  padding: 0;
  border: 1px solid #dfe6f2;
  border-radius: 8px;
  box-shadow: 0 14px 36px #233b651a;
  overflow: hidden;
}
</style>
