import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/login.vue'
import MainLayout from '../layout/index.vue'
import HomeView from '../views/HomeView.vue'
import QuotationList from '../views/QuotationList.vue'
import BeamQuotationLayout from '../views/BeamQuotationLayout.vue'
import BeamQuotationList from '../views/BeamQuotationList.vue'
import BeamQuotationHistory from '../views/BeamQuotationHistory.vue'
import QuotationStatistics from '../views/QuotationStatistics.vue'
import ApprovalLayout from '../views/ApprovalLayout.vue'
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
      { path: '', redirect: '/home' },
      {
        path: 'home',
        name: 'Home',
        component: HomeView,
        meta: { title: '首页' }
      },
      {
        path: 'user-management',
        name: 'UserManagement',
        component: () => import('../views/UserManagement.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'quotation',
        name: 'Quotation',
        component: QuotationList,
        meta: { title: '报价单' }
      },
      {
        path: 'beam-quotation',
        component: BeamQuotationLayout,
        meta: { title: '横梁载重单' },
        children: [
          {
            path: '',
            name: 'BeamQuotationList',
            component: BeamQuotationList
          },
          {
            path: 'history',
            name: 'BeamQuotationHistory',
            component: BeamQuotationHistory,
            meta: { title: '历史记录' }
          }
        ]
      },
      { path: 'beam-quotation-history', redirect: '/beam-quotation/history' },
      {
        path: 'quotation-statistics',
        name: 'QuotationStatistics',
        component: QuotationStatistics,
        meta: { title: '报价单统计' }
      },
      { path: 'Quotation-statistics', redirect: '/quotation-statistics' },
      {
        path: 'approval',
        component: ApprovalLayout,
        meta: { title: '审批管理' },
        children: [
          {
            path: '',
            name: 'Approval',
            component: Approval
          },
          {
            path: ':id',
            name: 'ApprovalDetail',
            component: ApprovalDetail,
            meta: { title: '审批详情' }
          }
        ]
      },
      {
        path: 'medium-shelf-weight',
        name: 'MediumShelfWeight',
        component: MediumShelfWeightTable,
        meta: { title: '中型货架重量表' }
      },
      {
        path: 'usd-conversion',
        name: 'UsdConversion',
        component: () => import('../views/UsdConversion.vue'),
        meta: { title: '美金换算' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0, left: 0 }
  }
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

  if (to.meta.adminOnly && user.role !== 'admin') {
    return '/'
  }

  return true
})

export default router
