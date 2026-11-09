<script setup lang="ts">
import { fmt } from '../../utils/metrics';
defineProps<{
  stages: {
    key: string;
    name: string;
    unit: string;
    color: string;
    value: number;
    rate: number | null;
  }[];
  totals: { visitPeople: number; contracts: number };
  selectedIndex?: number | null;
  compact?: boolean;
  hideFocus?: boolean;
}>();
const emit = defineEmits<{ select: [index: number] }>();
</script>
<template>
  <div class="conversion-funnel" :class="{ 'compact-funnel': compact }">
    <h4>客户转化漏斗</h4>
    <div v-if="!hideFocus" class="conversion-focus">
      <span>重点关注：到访→签约</span>
      <strong>{{
        totals.visitPeople ? fmt((totals.contracts / totals.visitPeople) * 100, 1) + '%' : '—'
      }}</strong>
    </div>
    <div class="funnel-stage-list" :class="{ 'has-selection': selectedIndex != null }">
      <div v-for="(stage, index) in stages" :key="stage.key" class="funnel-stage-row">
        <i
          v-if="index"
          class="stage-rate-connector"
          :style="{ left: `calc((100% - 120px) * ${0.94 - index * 0.066})` }"
          aria-hidden="true"
        />
        <button
          class="funnel-stage"
          :class="{ selected: selectedIndex === index }"
          :style="{ '--stage-color': stage.color, width: `${100 - index * 15}%` }"
          :aria-pressed="selectedIndex === index"
          @click="emit('select', index)"
        >
          <span>{{ stage.name }}</span>
          <strong
            >{{ fmt(stage.value) }} <small>{{ stage.unit }}</small></strong
          >
        </button>
        <div v-if="index" class="stage-conversion">
          <span
            >{{ stages[index - 1].name.replace(/数量|人数|套数/g, '') }}至{{
              stage.name.replace(/数量|人数|套数/g, '')
            }}转化率</span
          >
          <strong>{{ fmt(stage.rate || 0, 1) }}%</strong>
          <svg
            v-if="index < stages.length - 1"
            class="conversion-next-arrow"
            viewBox="0 0 16 30"
            fill="none"
            aria-hidden="true"
          >
            <path d="M8 2V27M3 21L8 27L13 21" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
h4 {
  margin: 0;
  font-size: 13px;
  color: #14243d;
}
.conversion-funnel {
  min-width: 0;
  align-self: center;
  width: 100%;
}
.conversion-focus {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 6px;
  background: #f3f7ff;
  color: #435775;
  font-size: 13px;
}
.conversion-focus strong {
  color: #2873ed;
  font-size: 15px;
}
.funnel-stage-list {
  padding-top: 12px;
}
.funnel-stage-row {
  position: relative;
  padding-right: 120px;
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.funnel-stage-row:last-child {
  margin-bottom: 0;
}
.funnel-stage {
  flex: none;
  height: 72px;
  border: 0;
  clip-path: polygon(0 0, 100% 0, 88% 100%, 12% 100%);
  background: var(--stage-color);
  opacity: 1;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  font: inherit;
  transition: opacity 0.15s;
}
.funnel-stage.selected,
.funnel-stage:hover,
.funnel-stage:focus-visible {
  opacity: 1;
}
.funnel-stage.selected {
  background: #2873ed;
}
.funnel-stage-list.has-selection .funnel-stage:not(.selected):not(:hover):not(:focus-visible) {
  opacity: 0.35;
}
.funnel-stage > span {
  font-size: 12px;
}
.funnel-stage strong {
  font-size: 19px;
}
.funnel-stage small {
  font-size: 11px;
  font-weight: 400;
}
.stage-conversion {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 100px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}
.stage-rate-connector {
  position: absolute;
  top: 50%;
  right: 108px;
  height: 1.5px;
  background: repeating-linear-gradient(to right, #8fb6ef 0 4px, transparent 4px 8px);
  border-radius: 2px;
  pointer-events: none;
}
.stage-conversion span {
  font-size: 10px;
  line-height: 14px;
  color: #7b8da8;
}
.stage-conversion strong {
  font-size: 19px;
  line-height: 24px;
  font-weight: 600;
  color: #2873ed;
}
.conversion-next-arrow {
  position: absolute;
  top: 48px;
  left: calc(50% - 8px);
  width: 16px;
  height: 30px;
  color: #8fb6ef;
  pointer-events: none;
}
.conversion-next-arrow path {
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.compact-funnel .conversion-focus {
  margin-top: 8px;
  padding: 8px 12px;
}
.compact-funnel .funnel-stage-list {
  padding-top: 10px;
}
.compact-funnel .funnel-stage-row {
  margin-bottom: 8px;
}
.compact-funnel .funnel-stage-row:last-child {
  margin-bottom: 0;
}
.compact-funnel .funnel-stage {
  height: 52px;
  gap: 2px;
  cursor: default;
}
.compact-funnel .funnel-stage strong {
  font-size: 17px;
  line-height: 21px;
}
.compact-funnel .stage-conversion strong {
  font-size: 13px;
  line-height: 21px;
}
.compact-funnel .stage-conversion {
  gap: 2px;
}
.compact-funnel .conversion-next-arrow {
  top: 40px;
  height: 16px;
}
</style>
