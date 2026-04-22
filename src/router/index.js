/**
 * @module router
 * @description Vue Router 路由配置
 * 
 * 统一路由管理，采用懒加载策略：
 * - 所有页面组件使用 dynamic import 按需加载
 * - 通过 meta 字段控制权限和标题
 * - 支持滚动位置恢复
 */

import { createRouter, createWebHashHistory } from 'vue-router'
import { applyAuthGuard } from '@/router/guards/authGuard'

/** ==================== 页面组件懒加载 ==================== */

const Login = () => import('../views/login.vue')
const Register = () => import('../views/register.vue')
const MainLayout = () => import('../layout/index.vue')
const HomeView = () => import('../views/HomeView.vue')
const UserManagement = () => import('../views/UserManagement.vue')

/** 报价单模块 */
const QuotationLayout = () => import('../views/QuotationLayout.vue')
const QuotationList = () => import('../views/QuotationList.vue')
const QuotationHistory = () => import('../views/QuotationHistory.vue')
const QuotationStatistics = () => import('../views/QuotationStatistics.vue')

/** 横梁载重模块 */
const BeamQuotationLayout = () => import('../views/BeamQuotationLayout.vue')
const BeamQuotationList = () => import('../views/BeamQuotationList.vue')
const BeamQuotationHistory = () => import('../views/BeamQuotationHistory.vue')

/** 审批模块 */
const ApprovalLayout = () => import('../views/ApprovalLayout.vue')
const Approval = () => import('../views/approval.vue')
const ApprovalDetail = () => import('../views/approvalDetail.vue')
const ApprovalHistory = () => import('../views/ApprovalHistory.vue')

/** 其他页面 */
const MediumShelfWeightTable = () => import('../views/MediumShelfWeightTable.vue')
const MemoManagement = () => import('../views/MemoManagement.vue')
const MessageManagement = () => import('../views/MessageManagement.vue')
const UsdConversion = () => import('../views/UsdConversion.vue')
const CustomerManagement = () => import('../views/CustomerManagement.vue')

/** ==================== 路由表 ==================== */

const routes = [
  /** 公开页面（无需登录） */
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

  /** 主布局（需要登录） */
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/home' },
      
      /** 首页 */
      {
        path: 'home',
        name: 'Home',
        component: HomeView,
        meta: { title: '首页' }
      },
      
      /** 用户管理（仅管理员） */
      {
        path: 'user-management',
        name: 'UserManagement',
        component: UserManagement,
        meta: { title: '用户管理', adminOnly: true }
      },

      /** 报价单模块 */
      {
        path: 'quotation',
        component: QuotationLayout,
        meta: { title: '报价单' },
        children: [
          {
            path: '',
            name: 'Quotation',
            component: QuotationList,
            meta: { title: '报价单' }
          },
          {
            path: 'history',
            name: 'QuotationHistory',
            component: QuotationHistory,
            meta: { title: '报价单历史' }
          }
        ]
      },

      /** 横梁载重模块 */
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
            meta: { title: '横梁载重单历史' }
          }
        ]
      },

      /** 报价单统计 */
      {
        path: 'quotation-statistics',
        name: 'QuotationStatistics',
        component: QuotationStatistics,
        meta: { title: '报价单统计' }
      },

      /** 审批管理（仅管理员） */
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
            path: 'history',
            name: 'ApprovalHistory',
            component: ApprovalHistory,
            meta: { title: '审批历史', adminOnly: true }
          },
          {
            path: 'history/:id',
            name: 'ApprovalHistoryDetail',
            component: ApprovalDetail,
            meta: { title: '审批历史详情', adminOnly: true }
          },
          {
            path: ':id',
            name: 'ApprovalDetail',
            component: ApprovalDetail,
            meta: { title: '审批详情', adminOnly: true }
          }
        ]
      },

      /** 中型货架重量表 */
      {
        path: 'medium-shelf-weight',
        name: 'MediumShelfWeight',
        component: MediumShelfWeightTable,
        meta: { title: '中型货架重量表' }
      },

      /** 备忘录 */
      {
        path: 'memo-management',
        name: 'MemoManagement',
        component: MemoManagement,
        meta: { title: '备忘录' }
      },

      /** 美金换算 */
      {
        path: 'usd-conversion',
        name: 'UsdConversion',
        component: UsdConversion,
        meta: { title: '美金换算' }
      },

      /** 留言管理 */
      {
        path: 'message',
        name: 'MessageManagement',
        component: MessageManagement,
        meta: { title: '留言管理' }
      },

      /** 客户管理 */
      {
        path: 'customer-management',
        name: 'CustomerManagement',
        component: CustomerManagement,
        meta: { title: '客户管理' }
      }
    ]
  },

  /** 兼容旧路径的重定向 */
  { path: '/beam-quotation-history', redirect: '/beam-quotation/history' },
  { path: '/quotation-history', redirect: '/quotation/history' },
  { path: '/Quotation-statistics', redirect: '/quotation-statistics' }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  
  /** 滚动行为：支持返回时恢复位置，否则滚动到顶部 */
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, left: 0 }
  }
})

router.beforeEach(applyAuthGuard)

export default router
