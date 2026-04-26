/**
 * @file router/index.js
 * @description Vue Router 路由配置 & 导航守卫
 *
 * 功能说明：
 * - 定义所有页面路由及其层级关系
 * - 使用懒加载（动态 import）实现代码分割
 * - 配置路由元信息（权限、标题等）
 * - 注册全局前置导航守卫（认证检查）
 *
 * 路由结构：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  /login          登录页（公开）                              │
 * │  /register       注册页（公开）                              │
 * │  /               主布局（需登录）                            │
 * │  ├── /home                    首页                          │
 * │  ├── /user-management         用户管理（admin）             │
 * │  ├── /quotation               报价单模块                     │
 * │  │   ├── /quotation           报价单列表                     │
 * │  │   └── /quotation/history   报价单历史                     │
 * │  ├── /beam-quotation          横梁载重模块                   │
 * │  │   ├── /beam-quotation      横梁列表                      │
 * │  │   └── /beam-quotation/history 历史记录                  │
 * │  ├── /approval                审批管理                       │
 * │  │   ├── /approval            待审批                        │
 * │  │   ├── /approval/history    审批历史                      │
 * │  │   └── /approval/:id        审批详情                      │
 * │  ├── /medium-shelf-weight     中型货架重量表                 │
 * │  ├── /memo-management         备忘录                         │
 * │  ├── /usd-conversion          美金换算                       │
 * │  ├── /message                 留言管理                       │
 * │  └── /customer-management     客户管理                       │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 路由元信息 (meta) 说明：
 * - public: 是否为公开页面（无需登录）
 * - title: 页面标题（用于浏览器标签和面包屑）
 * - requiresPermission: 所需权限标识（如 'user:manage'）
 */

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

/** 路由规则定义 */
const routes = [
  {
    path: '/login',
    component: Login,
    meta: { public: true, title: '登录' },
  },
  {
    path: '/register',
    component: Register,
    meta: { public: true, title: '注册' },
  },

  // ==================== 主布局（嵌套路由）====================

  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/home' },
      {
        path: 'home',
        name: 'Home',
        component: HomeView,
        meta: { title: '首页' },
      },
      {
        path: 'user-management',
        name: 'UserManagement',
        component: UserManagement,
        meta: { title: '用户管理', requiresPermission: 'user:manage' },
      },

      // ---- 报价单模块 ----

      {
        path: 'quotation',
        component: QuotationLayout,
        meta: { title: '报价单' },
        children: [
          {
            path: '',
            name: 'Quotation',
            component: QuotationList,
            meta: { title: '报价单', requiresPermission: 'quotation:write' },
          },
          {
            path: 'history',
            name: 'QuotationHistory',
            component: QuotationHistory,
            meta: { title: '报价单历史' },
          },
        ],
      },

      // ---- 横梁载重模块 ----

      {
        path: 'beam-quotation',
        component: BeamQuotationLayout,
        meta: { title: '横梁载重单' },
        children: [
          {
            path: '',
            name: 'BeamQuotationList',
            component: BeamQuotationList,
            meta: { title: '横梁载重单', requiresPermission: 'beam:write' },
          },
          {
            path: 'history',
            name: 'BeamQuotationHistory',
            component: BeamQuotationHistory,
            meta: { title: '横梁载重单历史' },
          },
        ],
      },
      {
        path: 'quotation-statistics',
        name: 'QuotationStatistics',
        component: QuotationStatistics,
        meta: { title: '报价单统计' },
      },

      // ---- 审批管理模块 ----

      {
        path: 'approval',
        component: ApprovalLayout,
        meta: { title: '审批管理', requiresPermission: 'approval:review' },
        children: [
          {
            path: '',
            name: 'Approval',
            component: Approval,
          },
          {
            path: 'history',
            name: 'ApprovalHistory',
            component: ApprovalHistory,
            meta: { title: '审批历史', requiresPermission: 'approval:review' },
          },
          {
            path: 'history/:id',
            name: 'ApprovalHistoryDetail',
            component: ApprovalDetail,
            meta: { title: '审批历史详情', requiresPermission: 'approval:review' },
          },
          {
            path: ':id',
            name: 'ApprovalDetail',
            component: ApprovalDetail,
            meta: { title: '审批详情', requiresPermission: 'approval:review' },
          },
        ],
      },

      // ---- 独立功能页面 ----

      {
        path: 'medium-shelf-weight',
        name: 'MediumShelfWeight',
        component: MediumShelfWeightTable,
        meta: { title: '中型货架重量表' },
      },
      {
        path: 'memo-management',
        name: 'MemoManagement',
        component: MemoManagement,
        meta: { title: '备忘录' },
      },
      {
        path: 'usd-conversion',
        name: 'UsdConversion',
        component: UsdConversion,
        meta: { title: '美金换算' },
      },
      {
        path: 'message',
        name: 'MessageManagement',
        component: MessageManagement,
        meta: { title: '留言管理' },
      },
      {
        path: 'customer-management',
        name: 'CustomerManagement',
        component: CustomerManagement,
        meta: { title: '客户管理' },
      },
    ],
  },

  // ==================== 重定向路由（兼容旧链接）====================

  { path: '/beam-quotation-history', redirect: '/beam-quotation/history' },
  { path: '/quotation-history', redirect: '/quotation/history' },
  { path: '/Quotation-statistics', redirect: '/quotation-statistics' },
]

/** Vue Router 实例 */
const router = createRouter({
  /** 使用 Hash 模式（兼容 GitHub Pages 等静态托管） */
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,

  /**
   * 滚动行为控制
   * - 有保存的位置（浏览器后退）：恢复到原位置
   * - 否则：滚动到页面顶部
   */
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, left: 0 }
  },
})

router.beforeEach(applyAuthGuard)

export default router
