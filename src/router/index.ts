import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
export default createRouter({
  scrollBehavior: (_to, _from, savedPosition) => savedPosition || { top: 0 },
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
      path: '/marketing-analysis/city/:organization',
      name: 'city-marketing-detail',
      component: () => import('../views/MarketingAnalysis/index.vue'),
      meta: { title: '城市公司营销分析' },
    },
    {
      path: '/marketing-analysis/project/:project',
      name: 'project-marketing-detail',
      component: () => import('../views/MarketingAnalysis/ProjectDetail.vue'),
      meta: { title: '项目营销分析详情' },
    },
    {
      path: '/multi-analysis',
      component: () => import('../views/MultiAnalysis/index.vue'),
      meta: { title: '多维分析' },
    },
    {
      path: '/multi-analysis-2',
      component: () => import('../views/MultiAnalysis2/index.vue'),
      meta: { title: '多维分析' },
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
