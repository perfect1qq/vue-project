import { createRouter, createWebHashHistory } from 'vue-router'
import { applyAuthGuard } from '@/router/guards/authGuard'

const Login = () => import('../views/login.vue')
const Register = () => import('../views/register.vue')
const MainLayout = () => import('../layout/index.vue')
const HomeView = () => import('../views/HomeView.vue')
const UserManagement = () => import('../views/UserManagement.vue')

const QuotationLayout = () => import('../views/QuotationLayout.vue')
const QuotationList = () => import('../views/QuotationList.vue')
const QuotationHistory = () => import('../views/QuotationHistory.vue')
const QuotationStatistics = () => import('../views/QuotationStatistics.vue')

const BeamQuotationLayout = () => import('../views/BeamQuotationLayout.vue')
const BeamQuotationList = () => import('../views/BeamQuotationList.vue')
const BeamQuotationHistory = () => import('../views/BeamQuotationHistory.vue')

const ApprovalLayout = () => import('../views/ApprovalLayout.vue')
const Approval = () => import('../views/approval.vue')
const ApprovalDetail = () => import('../views/approvalDetail.vue')
const ApprovalHistory = () => import('../views/ApprovalHistory.vue')

const MediumShelfWeightTable = () => import('../views/MediumShelfWeightTable.vue')
const MemoManagement = () => import('../views/MemoManagement.vue')
const MessageManagement = () => import('../views/MessageManagement.vue')
const UsdConversion = () => import('../views/UsdConversion.vue')
const CustomerManagement = () => import('../views/CustomerManagement.vue')

const routes = [
  {
    path: '/login',
    component: Login,
    meta: { public: true, title: '登录' }
  },
  {
    path: '/register',
    component: Register,
    meta: { public: true, title: '注册' }
  },
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
        component: UserManagement,
        meta: { title: '用户管理', requiresPermission: 'user:manage' }
      },
      {
        path: 'quotation',
        component: QuotationLayout,
        meta: { title: '报价单' },
        children: [
          {
            path: '',
            name: 'Quotation',
            component: QuotationList,
            meta: { title: '报价单', requiresPermission: 'quotation:write' }
          },
          {
            path: 'history',
            name: 'QuotationHistory',
            component: QuotationHistory,
            meta: { title: '报价单历史' }
          }
        ]
      },
      {
        path: 'beam-quotation',
        component: BeamQuotationLayout,
        meta: { title: '横梁载重单' },
        children: [
          {
            path: '',
            name: 'BeamQuotationList',
            component: BeamQuotationList,
            meta: { title: '横梁载重单', requiresPermission: 'beam:write' }
          },
          {
            path: 'history',
            name: 'BeamQuotationHistory',
            component: BeamQuotationHistory,
            meta: { title: '横梁载重单历史' }
          }
        ]
      },
      {
        path: 'quotation-statistics',
        name: 'QuotationStatistics',
        component: QuotationStatistics,
        meta: { title: '报价单统计' }
      },
      {
        path: 'approval',
        component: ApprovalLayout,
        meta: { title: '审批管理', requiresPermission: 'approval:review' },
        children: [
          {
            path: '',
            name: 'Approval',
            component: Approval
          },
          {
            path: 'history',
            name: 'ApprovalHistory',
            component: ApprovalHistory,
            meta: { title: '审批历史', requiresPermission: 'approval:review' }
          },
          {
            path: 'history/:id',
            name: 'ApprovalHistoryDetail',
            component: ApprovalDetail,
            meta: { title: '审批历史详情', requiresPermission: 'approval:review' }
          },
          {
            path: ':id',
            name: 'ApprovalDetail',
            component: ApprovalDetail,
            meta: { title: '审批详情', requiresPermission: 'approval:review' }
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
        component: UsdConversion,
        meta: { title: '美金换算' }
      },
      {
        path: 'message',
        name: 'MessageManagement',
        component: MessageManagement,
        meta: { title: '留言管理' }
      },
      {
        path: 'customer-management',
        name: 'CustomerManagement',
        component: CustomerManagement,
        meta: { title: '客户管理' }
      }
    ]
  },
  { path: '/beam-quotation-history', redirect: '/beam-quotation/history' },
  { path: '/quotation-history', redirect: '/quotation/history' },
  { path: '/Quotation-statistics', redirect: '/quotation-statistics' }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, left: 0 }
  }
})

router.beforeEach(applyAuthGuard)

export default router