import { createRouter, createWebHistory } from 'vue-router';
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/marketing-analysis' },
    {
      path: '/marketing-analysis',
      component: () => import('../views/MarketingAnalysis/index.vue'),
      meta: { title: '营销分析' },
    },
    {
      path: '/multi-analysis',
      component: () => import('../views/MultiAnalysis/index.vue'),
      meta: { title: '多维分析' },
    },
    {
      path: '/multi-analysis-2',
      component: () => import('../views/MultiAnalysis2/index.vue'),
      meta: { title: '多维分析2' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/marketing-analysis' },
  ],
});
