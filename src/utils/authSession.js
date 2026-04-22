/**
 * @module utils/authSession
 * @description 认证会话管理
 *
 * 处理 Token 存储和认证过期逻辑：
 * - Token 的存取与清除
 * - 401 错误时的自动跳转登录
 * - 用户主动登出
 *
 * 退出登录流程（完整版）：
 * 1. 前端调用 /api/logout 通知后端
 * 2. 后端处理（销毁 Session 或将 Token 加入黑名单）
 * 3. 前端清理所有本地状态：
 *    - localStorage: token, user, 标签页缓存
 *    - sessionStorage: 会话数据
 *    - Pinia Store: 用户状态
 * 4. 页面跳转到 /login
 */

import router from '../router'
import request from './request'
import { to } from '@/utils/async'

/**
 * 获取当前 Token
 * @returns {string|null}
 */
export const getToken = () => localStorage.getItem('token')

/**
 * 设置 Token
 * @param {string} token - JWT Token
 */
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token)
  }
}

/**
 * 清理标签页缓存（localStorage 中所有标签页相关的 key）
 */
const clearTabCache = () => {
  const prefixes = [
    'beilit.visited-views:',
    'ruoyi-like-visited-views',
    'beilit.tab-session-id',
    'beilit.tags-view'
  ]
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && prefixes.some(prefix => key.startsWith(prefix))) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))
}

/**
 * 清理会话存储（sessionStorage）
 */
const clearSessionStorage = () => {
  sessionStorage.clear()
}

/**
 * 清理 Pinia Store 用户状态
 */
const clearPiniaStore = async () => {
  try {
    const { useUserStore } = await import('@/stores/user')
    const userStore = useUserStore()
    userStore.logout()
  } catch {
    // Pinia store 可能未初始化，忽略错误
  }
}

/**
 * 清理标签页内存状态（useTagsView + useBreadcrumbTabs）
 */
const clearTabsMemoryState = async () => {
  try {
    const { useTagsView } = await import('@/composables/useTagsView')
    const tagsView = useTagsView()
    tagsView.removeAllViews()
  } catch {
    // ignore
  }

  try {
    const { useBreadcrumbTabs } = await import('@/composables/useBreadcrumbTabs')
    const tabs = useBreadcrumbTabs()
    if (tabs.resetAll) tabs.resetAll()
  } catch {
    // ignore
  }
}

/**
 * 清除认证信息并跳转登录页（完整清理）
 *
 * 清理内容：
 * - localStorage: token, user, 标签页缓存
 * - sessionStorage: 所有会话数据
 * - Pinia Store: 用户状态、Authorization 头
 * - 内存状态: useTagsView, useBreadcrumbTabs
 *
 * 静默处理，不显示任何提示弹窗
 */
export const clearAuthAndRedirect = async () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  clearTabCache()
  clearSessionStorage()
  await clearPiniaStore()
  await clearTabsMemoryState()

  router.push('/login').then(() => {}).catch(() => {})
}

/**
 * 处理认证过期
 * @param {string} [code] - 服务端返回的过期原因码（已废弃参数）
 */
export const handleAuthExpired = (code) => clearAuthAndRedirect()

/**
 * 用户主动登出（调用后端接口 + 完整清理本地状态）
 */
export const logoutByUser = async () => {
  await to(request.post('/api/logout'))
  await clearAuthAndRedirect()
}

export default { getToken, setToken, handleAuthExpired, logoutByUser }