<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import NineGridPanel from './components/NineGridPanel.vue';
import { useDashboardStore } from '../../stores/dashboard';
import { splitAdvisorRecords } from '../../mocks/advisors';
import type { CompareMode, GridThresholds } from '../../types/nineGrid';
const store = useDashboardStore();
const mode = ref<CompareMode>('yoy');
const thresholds = reactive<GridThresholds>({ x: 5, cost: 3, conversion: 3, minContracts: 10 });
const mock = import.meta.env.VITE_USE_MOCK !== 'false';
const advisorRows = computed(() =>
  store.rows.some((r) => r.advisorId) ? store.rows : mock ? splitAdvisorRecords(store.rows) : [],
);
</script>
<template>
  <div class="panel nine-grid-toolbar">
    <div>
      <h2>营销增长与效率九宫格</h2>
      <p>渠道、项目与顾问分别比较 · {{ mock ? '模拟数据' : '接口数据' }} · 共用顶部筛选</p>
    </div>
    <div class="nine-grid-comparison">
      <span>比较方式</span
      ><el-radio-group v-model="mode" size="small"
        ><el-radio-button value="yoy">同比</el-radio-button
        ><el-radio-button value="mom">环比</el-radio-button></el-radio-group
      >
    </div>
  </div>
  <div class="panel nine-grid-thresholds">
    <span class="threshold-title">平稳区间</span
    ><label
      >签约量 ±
      <el-input-number
        v-model="thresholds.x"
        :min="1"
        :max="50"
        :step="1"
        :precision="0"
        :value-on-clear="5"
        size="small"
        controls-position="right"
        aria-label="签约量平稳区间"
      />
      %</label
    ><label
      >获客成本 ±
      <el-input-number
        v-model="thresholds.cost"
        :min="1"
        :max="30"
        :precision="0"
        :value-on-clear="3"
        size="small"
        controls-position="right"
        aria-label="成本平稳区间"
      />
      %</label
    ><label
      >顾问转化率 ±
      <el-input-number
        v-model="thresholds.conversion"
        :min="1"
        :max="20"
        :precision="0"
        :value-on-clear="3"
        size="small"
        controls-position="right"
        aria-label="顾问转化率平稳区间"
      />
      pp</label
    ><label
      >最少签约
      <el-input-number
        v-model="thresholds.minContracts"
        :min="1"
        :max="1000"
        :precision="0"
        :value-on-clear="10"
        size="small"
        controls-position="right"
        aria-label="最少签约套数"
      />
      套 / 期</label
    ><el-button
      link
      type="primary"
      @click="Object.assign(thresholds, { x: 5, cost: 3, conversion: 3, minContracts: 10 })"
      >恢复默认</el-button
    >
  </div>
  <NineGridPanel
    kind="channel"
    title="渠道营销量效分析"
    description="每个气泡表示供应商、平台或推荐来源；颜色区分渠道大类，点击图例查看该类细分项，右下方为增量降本。"
    :rows="store.rows"
    :mode="mode"
    :thresholds="thresholds"
  />
  <NineGridPanel
    kind="project"
    title="项目营销量效分析"
    description="一个气泡代表一个项目；颜色区分区域，结合项目阶段与货源结构判断量效。"
    :rows="store.rows"
    :mode="mode"
    :thresholds="thresholds"
  />
  <el-alert
    v-if="mock"
    title="顾问数据为虚构演示：每项目 4 位顾问，分配后业绩合计与项目数据一致。"
    type="info"
    :closable="false"
  />
  <el-alert
    v-else-if="!advisorRows.length"
    title="接口尚未提供顾问归属，请补充 advisorId 和 advisor 字段后查看顾问九宫格。"
    type="info"
    :closable="false"
  />
  <NineGridPanel
    kind="advisor"
    title="顾问签约增长与转化分析"
    description="一个气泡代表一位顾问；颜色区分所属项目，右上方为增量提效；pp 为百分点。"
    :rows="advisorRows"
    :mode="mode"
    :thresholds="thresholds"
  />
</template>
