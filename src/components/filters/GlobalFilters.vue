<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { useDashboardStore, defaultFilter } from '../../stores/dashboard';
import { channelTree } from '../../utils/channels';
import type { DashboardFilter } from '../../types';
const store = useDashboardStore();
const draft = reactive<DashboardFilter>(JSON.parse(JSON.stringify(store.filter)));
const advanced = ref(false);
watch(
  () => store.filter,
  (f) => Object.assign(draft, JSON.parse(JSON.stringify(f))),
  { deep: true },
);
const organizations = computed(() =>
  [...new Set(store.rows.map((r) => r.organization))].map((label) => ({ label, value: label })),
);
const options = (key: 'region' | 'city' | 'project' | 'channel' | 'customer') => [
  ...new Set(
    store.rows
      .filter(
        (r) =>
          (!draft.organization || r.organization === draft.organization) &&
          (!draft.region || key === 'region' || r.region === draft.region) &&
          (!draft.city || ['region', 'city'].includes(key) || r.city === draft.city),
      )
      .map((r) => r[key]),
  ),
];
watch(
  () => draft.organization,
  () => {
    draft.region = '';
    draft.city = '';
    draft.project = '';
  },
);
watch(
  () => draft.region,
  () => {
    draft.city = '';
    draft.project = '';
  },
);
watch(
  () => draft.city,
  () => {
    draft.project = '';
  },
);
const apply = () => {
  advanced.value = false;
  void store.query(JSON.parse(JSON.stringify(draft)));
};
const reset = () => {
  Object.assign(draft, defaultFilter());
  apply();
};
const activeCount = computed(
  () => [draft.city, draft.channel, draft.customer].filter(Boolean).length,
);
const channelOptions = computed(() =>
  channelTree(
    store.rows.filter(
      (r) =>
        (!draft.organization || r.organization === draft.organization) &&
        (!draft.region || r.region === draft.region) &&
        (!draft.city || r.city === draft.city) &&
        (!draft.project || r.project === draft.project),
    ),
  ),
);
const channelPath = computed<string[]>({
  get: () =>
    draft.channel
      ? [
          draft.channel,
          ...(draft.channelObject ? [draft.channelObject] : []),
          ...(draft.channelDetail ? [draft.channelDetail] : []),
        ]
      : [],
  set: (path) => {
    draft.channel = path?.[0] || '';
    draft.channelObject = path?.[1] || '';
    draft.channelDetail = path?.[2] || '';
  },
});
const channelLabel = computed(() => {
  const f = store.filter;
  const sample = store.rows.find(
    (r) =>
      r.channel === f.channel &&
      (!f.channelObject || r.channelObjectId === f.channelObject) &&
      (!f.channelDetail || r.channelDetailId === f.channelDetail),
  );
  return [
    f.channel,
    f.channelObject ? sample?.channelObject : '',
    f.channelDetail ? sample?.channelDetail : '',
  ]
    .filter(Boolean)
    .join(' / ');
});
</script>
<template>
  <section class="panel filter-panel">
    <el-form class="filter-form" label-position="left" :inline="true" @submit.prevent="apply">
      <el-form-item label="期间" class="period-field"
        ><el-date-picker
          v-model="draft.period"
          type="monthrange"
          value-format="YYYY-MM"
          format="YYYY/MM"
          range-separator="—"
          start-placeholder="开始月份"
          end-placeholder="结束月份"
          :clearable="false"
      /></el-form-item>
      <el-form-item label="组织"
        ><el-tree-select
          v-model="draft.organization"
          :data="[{ label: '招商蛇口', value: '', children: organizations }]"
          check-strictly
          clearable
          placeholder="全部组织"
      /></el-form-item>
      <el-form-item label="区域" class="region-field"
        ><el-select v-model="draft.region" clearable placeholder="全部区域"
          ><el-option v-for="v in options('region')" :key="v" :value="v" :label="v" /></el-select
      ></el-form-item>
      <el-form-item label="项目" class="project-field"
        ><el-select v-model="draft.project" filterable clearable placeholder="全部项目"
          ><el-option v-for="v in options('project')" :key="v" :value="v" :label="v" /></el-select
      ></el-form-item>
      <div class="filter-actions">
        <el-button class="more-filter" @click="advanced = true"
          >更多条件{{ activeCount ? ' · ' + activeCount : '' }}</el-button
        ><el-button type="primary" :icon="Search" :loading="store.loading" native-type="submit"
          >查询</el-button
        ><el-button class="reset-button" :disabled="store.loading" @click="reset"
          >重置筛选</el-button
        >
      </div>
      <div class="data-date">数据更新：{{ store.updatedAt.split(' ')[0] || '加载中' }}</div>
    </el-form>
    <div
      v-if="store.filter.city || store.filter.channel || store.filter.customer"
      class="applied-filters"
    >
      <span>已选条件：</span
      ><el-tag v-if="store.filter.city" size="small">{{ store.filter.city }}</el-tag
      ><el-tag v-if="store.filter.channel" size="small">{{ channelLabel }}</el-tag
      ><el-tag v-if="store.filter.customer" size="small">{{ store.filter.customer }}</el-tag>
    </div>
  </section>
  <el-drawer v-model="advanced" title="更多筛选条件" size="400px"
    ><el-form label-position="top"
      ><el-form-item label="城市"
        ><el-select v-model="draft.city" clearable placeholder="全部城市"
          ><el-option
            v-for="v in options('city')"
            :key="v"
            :value="v"
            :label="v" /></el-select></el-form-item
      ><el-form-item label="营销渠道"
        ><el-cascader
          v-model="channelPath"
          :options="channelOptions"
          :props="{ checkStrictly: true }"
          :show-all-levels="false"
          clearable
          filterable
          placeholder="大类 / 供应商平台 / 细分触点"
      /></el-form-item>
      <el-form-item label="客户类型"
        ><el-select v-model="draft.customer" clearable placeholder="全部客户"
          ><el-option
            v-for="v in options('customer')"
            :key="v"
            :value="v"
            :label="v" /></el-select></el-form-item
      ><el-form-item label="数据口径"
        ><el-select v-model="draft.basis"
          ><el-option label="签约口径" value="签约口径" /></el-select></el-form-item
      ><el-alert
        title="签约口径：以签约完成月份归属业绩；客户数在项目、渠道、客群内去重。"
        :closable="false"
        type="info" /></el-form
    ><template #footer
      ><el-button @click="advanced = false">取消</el-button
      ><el-button type="primary" :loading="store.loading" @click="apply">查询</el-button></template
    ></el-drawer
  >
</template>
