import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
export default createRouter({
  history:
    import.meta.env.VITE_ROUTER_MODE === 'hash'
      ? createWebHashHistory(import.meta.env.BASE_URL)
      : createWebHistory(import.meta.env.BASE_URL),
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
    {
      path: '/marketing-six-forces',
      component: () => import('../views/MarketingSixForces/index.vue'),
      meta: { title: '营销六力' },
    },
    {
      path: '/marketing-six-forces/project/:project',
      component: () => import('../views/MarketingSixForces/ProjectDetail.vue'),
      meta: { title: '项目营销六力详情' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/marketing-analysis' },
  ],
});
