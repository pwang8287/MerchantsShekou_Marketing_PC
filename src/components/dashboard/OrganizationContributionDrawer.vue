<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowRight } from '@element-plus/icons-vue';
import { useDashboardStore } from '../../stores/dashboard';
import { channelRankingDimensions } from '../../utils/channelRanking';
import {
  organizationContribution,
  type OrganizationContributionNode,
} from '../../utils/organizationContribution';
import { fmt } from '../../utils/metrics';
import { formatStatisticsPeriod } from '../../utils/statisticsPeriod';
import { channelCatalog } from '../../mocks/channels';
import type { ConversionStageKey } from '../../utils/conversionAttribution';
const props = defineProps<{
  modelValue: boolean;
  stage: { key: ConversionStageKey; name: string; unit: string };
}>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const store = useDashboardStore();
const contribution = computed(() =>
  organizationContribution(store.rows, store.filter, props.stage.key, store.cityScope),
);
const expanded = ref(new Set<string>());
const organizationColumnLabel = computed(() =>
  channelRankingDimensions(store.filter, store.cityScope)
    .map((dimension) => ({ group: '城市群', organization: '城市', project: '项目' })[dimension])
    .join(' / '),
);
const visibleRows = computed(() => {
  const result: (Omit<OrganizationContributionNode, 'children'> & {
    depth: number;
    expandableChildren?: OrganizationContributionNode[];
  })[] = [];
  const append = (nodes: OrganizationContributionNode[], depth: number) => {
    for (const node of nodes) {
      const { children, ...values } = node;
      result.push({ ...values, depth, expandableChildren: children });
      if (node.children?.length && expanded.value.has(node.id)) append(node.children, depth + 1);
    }
  };
  append(contribution.value.nodes, 0);
  return result;
});
function toggleRow(row: { id: string; expandableChildren?: OrganizationContributionNode[] }) {
  if (!row.expandableChildren?.length) return;
  const next = new Set(expanded.value);
  if (next.has(row.id)) next.delete(row.id);
  else next.add(row.id);
  expanded.value = next;
}
watch(contribution, () => {
  expanded.value = new Set();
});
</script>
<template>
  <el-drawer
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="组织贡献明细"
    size="78%"
    append-to-body
  >
    <div class="contribution-context">
      <span
        >{{ store.filter.organizationLabel || '招商蛇口' }} ·
        {{ formatStatisticsPeriod(store.filter) }}</span
      ><span>{{ stage.name }}：{{ fmt(contribution.total) }} {{ stage.unit }}</span>
    </div>
    <section class="contribution-panel">
      <el-table :data="visibleRows" row-key="id" size="small" empty-text="当前筛选条件暂无数据">
        <el-table-column :label="organizationColumnLabel" min-width="230">
          <template #default="{ row }">
            <div class="organization-node" :style="{ paddingLeft: row.depth * 22 + 'px' }">
              <button
                v-if="row.expandableChildren?.length"
                type="button"
                class="organization-expand"
                :aria-expanded="expanded.has(row.id)"
                :aria-label="(expanded.has(row.id) ? '收起' : '展开') + row.name"
                @click="toggleRow(row)"
              >
                <el-icon :class="{ 'is-expanded': expanded.has(row.id) }"><ArrowRight /></el-icon>
              </button>
              <span v-else class="organization-expand-placeholder" />
              <button
                v-if="row.expandableChildren?.length"
                type="button"
                class="organization-name"
                @click="toggleRow(row)"
              >
                {{ row.name }}
              </button>
              <span v-else>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="value" :label="stage.name" min-width="110" align="right" sortable
          ><template #default="{ row }"
            >{{ fmt(row.value) }} {{ stage.unit }}</template
          ></el-table-column
        >
        <el-table-column prop="share" label="占比" min-width="85" align="right" sortable
          ><template #default="{ row }">{{
            row.share === null ? '—' : fmt(row.share, 2) + '%'
          }}</template></el-table-column
        >
        <el-table-column
          v-for="channel in channelCatalog"
          :key="channel.id"
          :label="channel.name"
          :prop="'channels.' + channel.name"
          min-width="100"
          align="right"
          sortable
          ><template #default="{ row }">{{
            fmt(row.channels[channel.name] || 0)
          }}</template></el-table-column
        >
      </el-table>
    </section>
  </el-drawer>
</template>
<style scoped>
.contribution-context {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  color: #8090a7;
  font-size: 12px;
  margin: 0 0 18px;
}
.contribution-panel {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}
.contribution-panel :deep(.el-table .cell) {
  white-space: nowrap;
  font-size: 11px;
  line-height: 20px;
  padding: 0 8px;
}
.contribution-panel :deep(.el-table td.el-table__cell) {
  padding: 8px 0;
}
.organization-node {
  display: flex;
  align-items: center;
  gap: 6px;
}
.organization-expand,
.organization-name {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  font: inherit;
}
.organization-expand,
.organization-expand-placeholder {
  width: 18px;
  height: 20px;
  flex: 0 0 18px;
}
.organization-expand {
  color: #a8abb2;
  font-size: 12px;
  line-height: 20px;
}
.organization-expand .el-icon {
  transition: transform 0.2s;
}
.organization-expand .is-expanded {
  transform: rotate(90deg);
}
.organization-name:hover {
  color: #1677ff;
}
</style>
