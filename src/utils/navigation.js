/**
 * @file utils/navigation.js
 * @description 导航 & 路由工具函数集
 *
 * 功能说明：
 * - 提供路由导航辅助函数（跳转、返回、新标签页打开）
 * - 读取当前登录用户信息（用于权限判断和动态标题）
 * - 格式化日期时间显示
 * - 解析路由显示标题（支持根据角色动态变化）
 *
 * 使用场景：
 * - 组件中需要获取当前用户信息时（无需 inject router）
 * - 面包屑导航显示页面标题
 * - 列表中的日期格式化
 * - 按钮点击后的页面跳转
 *
 * 使用示例：
 * import { readCurrentUser, navigateTo, formatDateTime } from '@/utils/navigation'
 *
 * // 获取当前用户
 * const user = readCurrentUser()
 * if (user.role === 'admin') showAdminMenu()
 *
 * // 页面跳转
 * navigateTo('/quotation', { page: 1 })
 *
 * // 日期格式化
 * formatDateTime('2024-01-15T10:30:00Z') // => '2024/01/15 10:30'
 */

import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { pinia } from '@/stores'

/** 缓存的 Router 实例（避免在非组件上下文中重复创建） */
let routerInstance = null

/**
 * 获取 Router 实例（懒初始化 + 单例缓存）
 *
 * 注意：此函数必须在 Vue 组件上下文中调用（setup 阶段）
 * @returns {import('vue-router').Router} Vue Router 实例
 */
const getRouter = () => {
  if (!routerInstance) {
    routerInstance = useRouter()
  }
  return routerInstance
}

/**
 * 读取当前登录用户信息
 *
 * 从 Pinia Store 中获取当前用户对象，
 * 如果未登录则返回默认的游客角色对象
 *
 * @returns {Object} 用户信息对象
 * @returns {number|null} returns.id - 用户 ID（未登录为 null）
 * @returns {string} returns.username - 用户名
 * @returns {string} returns.name - 显示名称
 * @returns {string} returns.role - 用户角色（admin / user / guest）
 */
export const readCurrentUser = () => {
  const store = useUserStore(pinia)
  return store.user || { role: 'guest' }
}

/**
 * 格式化日期时间为本地字符串
 *
 * 将 ISO 8601 格式的日期转换为易读的中文格式：
 * 输入：'2024-01-15T10:30:00Z'
 * 输出：'2024/01/15 10:30'
 *
 * @param {string|Date} dateStr - 日期字符串或 Date 对象
 * @param {string} [locale='zh-CN'] - 本地化语言标识
 * @returns {string} 格式化后的日期字符串，无效输入返回原值
 */
export const formatDateTime = (dateStr, locale = 'zh-CN') => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return String(dateStr)

    return date.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(dateStr)
  }
}

/**
 * 路由路径 → 显示标题映射表
 *
 * 支持函数形式，可根据角色等条件动态生成标题：
 * - /message → 管理员显示"留言管理"，其他角色显示"我的留言"
 */
const ROUTE_TITLE_MAP = {
  '/message': () => {
    const user = readCurrentUser()
    return user.role === 'admin' ? '留言管理' : '我的留言'
  },
  '/home': () => '首页',
  '/quotation': () => '报价单',
  '/beam-quotation': () => '横梁载重单',
  '/approval': () => '审批管理',
  '/memo-management': () => '备忘录',
  '/medium-shelf-weight': () => '中型货架重量表',
  '/usd-conversion': () => '美金换算',
  '/user-management': () => '用户管理',
}

/**
 * 解析路由的显示标题
 *
 * 查找优先级：
 * 1. 精确匹配 ROUTE_TITLE_MAP 中的路径
 * 2. 路由 meta.title 字段
 * 3. 前缀匹配（如 /quotation/history 匹配 /quotation）
 * 4. 取路径最后一段作为兜底
 *
 * @param {Object|string} route - 路由对象或路径字符串
 * @returns {string} 页面显示标题
 */
export const resolveRouteDisplayTitle = (route) => {
  const path = route?.path || route || ''

  if (ROUTE_TITLE_MAP[path]) {
    return ROUTE_TITLE_MAP[path](route)
  }

  if (route?.meta?.title) {
    return route.meta.title
  }

  const match = Object.keys(ROUTE_TITLE_MAP).find((key) =>
    path.startsWith(key),
  )
  return match ? ROUTE_TITLE_MAP[match](route) : path.split('/').pop() || '页面'
}

/**
 * 根据角色获取留言页面标题
 * @param {string} role - 用户角色
 * @returns {string} 页面标题
 */
export const getMessagePageTitle = (role) =>
  role === 'admin' ? '留言管理' : '我的留言'

/**
 * 导航到指定路径
 *
 * 支持带查询参数的跳转
 *
 * @param {string} path - 目标路径（如 '/quotation'）
 * @param {Object} [params={}] - URL 查询参数（如 { page: 1, keyword: 'test' }）
 */
export const navigateTo = (path, params = {}) => {
  const router = getRouter()
  if (Object.keys(params).length > 0) {
    router.push({ path, query: params })
  } else {
    router.push(path)
  }
}

/**
 * 在新标签页中打开 URL
 *
 * @param {string} url - 要打开的 URL 地址
 */
export const openInNewTab = (url) => window.open(url, '_blank')

/**
 * 返回上一页
 *
 * 如果有历史记录则后退，否则跳转到首页
 */
export const goBack = () => {
  const router = getRouter()
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

export default {
  navigateTo,
  openInNewTab,
  goBack,
  readCurrentUser,
  formatDateTime,
  resolveRouteDisplayTitle,
  getMessagePageTitle,
}
