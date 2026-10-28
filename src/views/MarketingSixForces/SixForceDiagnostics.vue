<script setup lang="ts">
import { computed, ref } from 'vue';
import type { EChartsOption } from 'echarts';
import BaseChart from '../../charts/components/BaseChart.vue';
import { forceDefinitions, healthClass, healthStatus } from '../../utils/sixForces';
import type { SixForceProject } from '../../utils/sixForces';
import { scoreDistribution } from '../../utils/scoreDistribution';
import { fmt } from '../../utils/metrics';

const props = defineProps<{ projects: SixForceProject[] }>();
const emit = defineEmits<{ select: [project: SixForceProject] }>();
const metric = ref('total');
const order = ref('total');
const selected = computed(() => forceDefinitions.findIndex((d) => d.id === metric.value));
const definition = computed(() =>
  selected.value < 0 ? { name: '综合得分', max: 100 } : forceDefinitions[selected.value],
);
const valueOf = (p: SixForceProject) =>
  selected.value < 0 ? p.total : p.forces[selected.value].score;
const heatRows = computed(() =>
  [...props.projects].sort((a, b) =>
    order.value === 'warning'
      ? b.warningCount - a.warningCount || b.total - a.total
      : b.total - a.total,
  ),
);
const pointRows = computed(() =>
  [...props.projects].sort((a, b) => valueOf(b) - valueOf(a) || a.name.localeCompare(b.name)),
);
const distribution = computed(() => scoreDistribution(props.projects.map(valueOf)));
const stats = computed(() => {
  const d = distribution.value;
  return d
    ? [
        { name: '最低分', value: d.min },
        { name: '下四分位 Q1', value: d.q1 },
        { name: '中位数', value: d.median },
        { name: '上四分位 Q3', value: d.q3 },
        { name: '最高分', value: d.max },
      ]
    : [];
});
const tone = (ratio: number) => healthClass(healthStatus(ratio));
function selectPoint(name: string) {
  const p = props.projects.find((p) => p.name === name);
  if (p) emit('select', p);
}
const chart = computed<EChartsOption>(() => {
  const d = distribution.value;
  if (!d) return {};
  return {
    tooltip: {
      trigger: 'item',
      confine: true,
      renderMode: 'richText',
      formatter: (params) => {
        const p = params as { seriesType: string; name: string; value: number[] };
        if (p.seriesType === 'boxplot')
          return `当前范围 · ${d.count} 个项目\n最低分：${fmt(d.min, 1)}\n下四分位：${fmt(d.q1, 1)}\n中位数：${fmt(d.median, 1)}\n上四分位：${fmt(d.q3, 1)}\n最高分：${fmt(d.max, 1)}`;
        return `${p.name}\n${definition.value.name}：${fmt(p.value[0], 1)} / ${definition.value.max} 分\n与中位数差：${fmt(p.value[0] - d.median, 1)} 分\n点击进入项目详情`;
      },
    },
    grid: { left: 190, right: 65, top: 26, bottom: 32 },
    xAxis: {
      type: 'value',
      min: 0,
      max: definition.value.max,
      name: '分',
      splitLine: { lineStyle: { color: '#edf1f7' } },
      axisLabel: { color: '#8290a5', fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: ['范围分布', ...pointRows.value.map((p) => p.name)],
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { width: 175, overflow: 'truncate', fontSize: 11, color: '#536985' },
    },
    series: [
      {
        type: 'boxplot',
        name: '范围分布',
        layout: 'horizontal',
        boxWidth: [16, 24],
        itemStyle: { color: '#dce9fc', borderColor: '#7aa5e4', borderWidth: 2 },
        data: [{ name: '范围分布', value: [d.min, d.q1, d.median, d.q3, d.max] }],
        silent: false,
      },
      {
        type: 'scatter',
        name: '项目得分',
        symbolSize: 11,
        label: {
          show: true,
          position: 'right',
          color: '#536985',
          fontSize: 11,
          formatter: (p) => fmt((p.value as number[])[0], 1),
        },
        data: pointRows.value.map((p, i) => ({
          name: p.name,
          value: [valueOf(p), i + 1],
          itemStyle: {
            color:
              valueOf(p) / definition.value.max >= 0.85
                ? '#62ac7e'
                : valueOf(p) / definition.value.max >= 0.6
                  ? '#e7a74e'
                  : '#dc7e85',
          },
        })),
        markArea: {
          silent: true,
          itemStyle: { color: '#2873ed08' },
          data: [[{ xAxis: d.q1 }, { xAxis: d.q3 }]],
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#2873ed', type: 'dashed' },
          label: { formatter: '中位数', position: 'insideEndTop', fontSize: 10 },
          data: [{ xAxis: d.median }],
        },
      },
    ],
  };
});
</script>

<template>
  <section class="panel diagnosis-panel">
    <header class="panel-head">
      <div>
        <h3>项目 × 六力热力表</h3>
        <p>按得分率统一着色，快速识别共性短板；点击项目或色块查看详情</p>
      </div>
      <el-select v-model="order" size="small" class="diagnosis-select" aria-label="热力表排序"
        ><el-option label="按综合得分排序" value="total" /><el-option
          label="优先查看预警项目"
          value="warning"
      /></el-select>
    </header>
    <div class="heat-legend">
      <span class="excellent">优秀 ≥85%</span><span class="attention">关注 60%–85%</span
      ><span class="warning">预警 &lt;60%</span><small>颜色按各能力得分 / 满分判断</small>
    </div>
    <el-table :data="heatRows" max-height="480" class="force-heatmap"
      ><el-table-column label="项目 / 城市" min-width="210" fixed
        ><template #default="{ row }"
          ><el-button link type="primary" @click="emit('select', row)">{{ row.name }}</el-button
          ><small class="heat-city">{{ row.region }} · {{ row.city }}</small></template
        ></el-table-column
      ><el-table-column label="综合得分" width="110" align="center"
        ><template #default="{ row }"
          ><b>{{ fmt(row.total, 1) }}</b
          ><small class="heat-city">{{ row.warningCount }} 项能力预警</small></template
        ></el-table-column
      ><el-table-column
        v-for="(d, i) in forceDefinitions"
        :key="d.id"
        :label="`${d.name} / ${d.max}`"
        min-width="140"
        align="center"
        ><template #default="{ row }"
          ><el-tooltip
            :content="`${row.name} · ${d.name}：${fmt(row.forces[i].score, 1)} / ${d.max}分，得分率 ${fmt(row.forces[i].ratio * 100, 1)}%，${row.forces[i].status}`"
            placement="top"
            ><button
              class="heat-cell"
              :class="tone(row.forces[i].ratio)"
              :aria-label="`${row.name} ${d.name} ${fmt(row.forces[i].score, 1)}分，查看详情`"
              @click="emit('select', row)"
            >
              <strong>{{ fmt(row.forces[i].score, 1) }}</strong
              ><small>{{ fmt(row.forces[i].ratio * 100, 1) }}%</small>
            </button></el-tooltip
          ></template
        ></el-table-column
      ></el-table
    >
  </section>
  <section class="panel diagnosis-panel">
    <header class="panel-head">
      <div>
        <h3>项目得分分布</h3>
        <p>箱体展示中间 50% 的项目区间，圆点展示每个项目的位置；点击圆点进入详情</p>
      </div>
      <el-select
        v-model="metric"
        size="small"
        class="diagnosis-select"
        aria-label="选择分布分析指标"
        ><el-option label="综合得分 / 100" value="total" /><el-option
          v-for="d in forceDefinitions"
          :key="d.id"
          :label="`${d.name} / ${d.max}`"
          :value="d.id"
      /></el-select>
    </header>
    <div class="distribution-stats">
      <div v-for="s in stats" :key="s.name" :class="{ 'stat-median': s.name === '中位数' }">
        <span>{{ s.name }}</span
        ><strong>{{ fmt(s.value, 1) }}<small>分</small></strong>
      </div>
    </div>
    <div class="distribution-chart">
      <BaseChart
        :option="chart"
        :height="Math.max(300, pointRows.length * 32 + 100)"
        :empty="!projects.length"
        unit="分"
        @select="selectPoint"
      />
    </div>
    <p class="distribution-note">
      统计范围：当前层级及全局筛选下的
      {{ projects.length }} 个项目，不受底部明细表搜索或分页影响。四分位数按排序位置 (n−1)×p
      线性插值；箱体两端为 Q1、Q3，须线为最低分、最高分，蓝色虚线为中位数。单项目时各分位数重合。
    </p>
  </section>
</template>

<style scoped>
.diagnosis-panel {
  padding: 22px;
  min-width: 0;
}
.panel-head p {
  font-size: 12px;
  color: #8493aa;
  margin: 7px 0 0;
  line-height: 1.7;
}
.diagnosis-select {
  width: 195px;
  flex-shrink: 0;
}
.heat-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  font-size: 11px;
}
.heat-legend > span {
  padding: 5px 9px;
  border-radius: 4px;
}
.heat-legend > small {
  color: #8a99ad;
}
.excellent {
  background: #e8f4e9;
  color: #3b8755;
}
.attention {
  background: #fff0d8;
  color: #a66e22;
}
.warning {
  background: #fbe3e5;
  color: #b34f5d;
}
.heat-city {
  display: block;
  color: #8a99ad;
  font-size: 10px;
  font-weight: 400;
  margin-top: 4px;
}
.heat-cell {
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
}
.heat-cell:hover {
  border-color: currentColor;
  filter: brightness(0.98);
}
.heat-cell:focus-visible {
  outline: 2px solid #2873ed;
  outline-offset: 2px;
}
.heat-cell strong {
  font-size: 15px;
}
.heat-cell small {
  font-size: 10px;
  opacity: 0.85;
}
.distribution-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin: 20px 0 10px;
}
.distribution-stats > div {
  padding: 13px 16px;
  background: #f7f9fc;
  border-radius: 7px;
}
.distribution-stats span {
  color: #8290a5;
  font-size: 11px;
}
.distribution-stats strong {
  display: block;
  font-size: 22px;
  color: #294569;
  margin-top: 7px;
}
.distribution-stats small {
  font-size: 10px;
  font-weight: 400;
  color: #8a99ad;
  margin-left: 5px;
}
.distribution-stats > .stat-median {
  background: #edf4ff;
}
.stat-median strong {
  color: #2873ed;
}
.distribution-chart {
  max-height: 540px;
  overflow: auto;
}
.distribution-note {
  font-size: 11px;
  color: #8a99ad;
  line-height: 1.9;
  margin: 12px 0 0;
}
@media (max-width: 900px) {
  .panel-head {
    gap: 12px;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .heat-legend {
    flex-wrap: wrap;
  }
  .distribution-stats {
    gap: 6px;
  }
  .distribution-stats > div {
    padding: 10px 8px;
  }
  .distribution-stats strong {
    font-size: 18px;
  }
}
</style>
