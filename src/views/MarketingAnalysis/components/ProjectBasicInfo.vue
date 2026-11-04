<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore } from '../../../stores/dashboard';
import { projectBasicInfo } from '../../../mocks/projectBasicInfo';
import { fmt } from '../../../utils/metrics';
const store = useDashboardStore();
const info = computed(() => projectBasicInfo[store.projectScope]);
const money = (value?: number) => (value === undefined ? '—' : `${fmt(value, 2)} 亿元`);
const percent = (value?: number) => (value === undefined ? '—' : `${fmt(value, 2)}%`);
</script>
<template>
  <section class="panel project-basic-info">
    <header>
      <i></i>
      <h3>项目信息</h3>
    </header>
    <div class="project-info-content">
      <div class="info-row project-name">
        <span>项目名称：</span><strong>{{ store.projectScope }}</strong>
      </div>
      <div class="info-pair">
        <div class="info-row">
          <span>我方股比：</span><b>{{ percent(info?.equityRatio) }}</b>
        </div>
        <div class="info-row">
          <span>并表类型：</span><b>{{ info?.consolidation || '—' }}</b>
        </div>
      </div>
      <div class="info-pair">
        <div class="info-row">
          <span>总地价：</span><b>{{ money(info?.landPrice) }}</b>
        </div>
        <div class="info-row">
          <span>权益地价：</span><b>{{ money(info?.equityLandPrice) }}</b>
        </div>
      </div>
      <div class="info-row">
        <span>可售单方地价：</span
        ><b>{{ info ? fmt(info.saleableLandPrice, 2) + '元 / ㎡' : '—' }}</b>
      </div>
      <div class="info-row">
        <span
          >回款地价覆盖率
          <el-tooltip content="累计回款金额 ÷ 总地价 × 100%" placement="top"
            ><i class="info-help">ⓘ</i></el-tooltip
          >：</span
        ><b>{{ percent(info?.collectionLandCoverage) }}</b>
      </div>
      <div class="info-dates">
        <div class="info-row">
          <span>开盘时间：</span
          ><b>实际 {{ info?.openingActual || '--' }}，计划 {{ info?.openingPlanned || '--' }}</b>
        </div>
        <div class="info-row">
          <span>竣备时间：</span
          ><b
            >实际 {{ info?.completionActual || '--' }}，计划
            {{ info?.completionPlanned || '--' }}</b
          >
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.project-basic-info {
  padding: 0;
  margin: 0;
  border-radius: 10px;
}
.project-basic-info header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 14px;
  border-bottom: 1px solid #edf1f7;
}
.project-basic-info header > i {
  width: 4px;
  height: 16px;
  border-radius: 3px;
  background: #168bff;
}
.project-basic-info h3 {
  font-size: 15px;
  margin: 0;
  color: #243547;
}
.project-info-content {
  padding: 14px;
  font-size: 12px;
  line-height: 1.8;
}
.info-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.info-row > span {
  color: #64748b;
}
.info-row b {
  font-weight: 400;
  color: #243547;
}
.project-name strong {
  color: #243547;
  font-size: 13px;
}
.info-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.info-help {
  font-style: normal;
  color: #94a3b8;
  cursor: help;
}
.info-dates {
  margin-top: 12px;
}
</style>
