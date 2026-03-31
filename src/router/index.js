import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/login.vue'
import MainLayout from '../views/MainLayout.vue'
import QuotationList from '../views/QuotationList.vue'
import BeamQuotationList from '../views/BeamQuotationList.vue'
import QuotationStatistics from '../views/QuotationStatistics.vue'
import Approval from '../views/approval.vue'
import ApprovalDetail from '../views/approvalDetail.vue'
import MediumShelfWeightTable from '../views/MediumShelfWeightTable.vue'


const routes = [
  { path: '/login', component: Login, meta: { public: true } },
  { path: '/register', component: () => import('../views/register.vue'), meta: { public: true } },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/quotation' },
      { path: 'user-management', component: () => import('../views/UserManagement.vue'), meta: { title: '用户管理', adminOnly: true } },
      { path: 'quotation', component: QuotationList, meta: { title: '报价单' } },
      { path: 'beam-quotation', component: BeamQuotationList, meta: { title: '横梁载重单' } },
      { path: 'quotation-statistics', component: QuotationStatistics, meta: { title: '报价单统计' } },
      { path: 'Quotation-statistics', redirect: '/quotation-statistics' },
      { path: 'approval', component: Approval, meta: { title: '审批管理' } },
      { path: 'approval/:id', component: ApprovalDetail, meta: { title: '审批详情' } },
     { path: 'medium-shelf-weight', component: MediumShelfWeightTable, meta: { title: '中型货架重量表' } },
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (to.meta.public) {
    if (token && (to.path === '/login' || to.path === '/register')) {
      return '/'
    }
    return true
  }

  if (!token) return '/login'

  // 管理员权限检查
  if (to.meta.adminOnly && user.role !== 'admin') {
    return '/'
  }

  return true
})

export default router
