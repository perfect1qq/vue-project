import { createRouter, createWebHashHistory } from 'vue-router'
import { readCurrentUser } from '@/utils/navigation'

/**
 * 路由表统一采用按需加载，降低首屏包体积。
 * 说明：
 * - 登录、注册页保留独立入口；
 * - 主站页面全部使用动态 import 懒加载；
 * - 通过 meta.title 统一生成标签页标题。
 */
const Login = () => import('../views/login.vue')
const MainLayout = () => import('../layout/index.vue')
const HomeView = () => import('../views/HomeView.vue')
const QuotationList = () => import('../views/QuotationList.vue')
const BeamQuotationLayout = () => import('../views/BeamQuotationLayout.vue')
const BeamQuotationList = () => import('../views/BeamQuotationList.vue')
const BeamQuotationHistory = () => import('../views/BeamQuotationHistory.vue')
const QuotationStatistics = () => import('../views/QuotationStatistics.vue')
const ApprovalLayout = () => import('../views/ApprovalLayout.vue')
const Approval = () => import('../views/approval.vue')
const ApprovalDetail = () => import('../views/approvalDetail.vue')
const MediumShelfWeightTable = () => import('../views/MediumShelfWeightTable.vue')
const MemoManagement = () => import('../views/MemoManagement.vue')
const MessageManagement = () => import('../views/MessageManagement.vue')

const routes = [
  { path: '/login', component: Login, meta: { public: true, title: '登录' } },
  { path: '/register', component: () => import('../views/register.vue'), meta: { public: true, title: '注册' } },
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
        meta: { title: '用户管理', adminOnly: true }
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
        meta: { title: '审批管理', adminOnly: true },
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
            meta: { title: '审批详情', adminOnly: true }
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
        path: 'memo-management',
        name: 'MemoManagement',
        component: MemoManagement,
        meta: { title: '备忘录' }
      },
      {
        path: 'usd-conversion',
        name: 'UsdConversion',
        component: () => import('../views/UsdConversion.vue'),
        meta: { title: '美金换算' }
      },
      {
        path: 'message',
        name: 'MessageManagement',
        component: MessageManagement,
        meta: { title: '留言管理' }
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

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const user = readCurrentUser()

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
