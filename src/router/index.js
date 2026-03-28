import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/login.vue'
import MainLayout from '../views/MainLayout.vue'
import QuotationList from '../views/QuotationList.vue'
import BeamQuotationList from '../views/BeamQuotationList.vue'
import QuotationStatistics from '../views/QuotationStatistics.vue'
import Approval from '../views/approval.vue'
import ApprovalDetail from '../views/approvalDetail.vue'

const routes = [
  { path: '/login', component: Login, meta: { public: true } },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/quotation' },
      { path: 'quotation', component: QuotationList, meta: { title: '报价单' } },
      { path: 'beam-quotation', component: BeamQuotationList, meta: { title: '横梁报价单' } },
      { path: 'quotation-statistics', component: QuotationStatistics, meta: { title: '报价单统计' } },
      { path: 'Quotation-statistics', redirect: '/quotation-statistics' },
      { path: 'approval', component: Approval, meta: { title: '审批管理' } },
      { path: 'approval/:id', component: ApprovalDetail, meta: { title: '审批详情' } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.path === '/login') {
    if (token) return next('/')
    return next()
  }
  if (!token) return next('/login')
  next()
})

export default router
