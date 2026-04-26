/**
 * @file utils/authSession.js
 * @description 认证会话管理工具（登录/登出/过期处理）
 *
 * 功能说明：
 * - 管理用户认证状态的生命周期
 * - 处理认证过期时的清理工作（缓存、Store、标签页等）
 * - 注册全局认证事件处理器
 * - 提供用户主动登出的完整流程
 *
 * 登出流程：
 * ┌─────────────────────────────────────────────┐
 * │  clearAuthAndRedirect()                     │
 * │  1. 清除 localStorage 中的标签页缓存         │
 * │  2. 清除 sessionStorage                     │
 * │  3. 清除 Pinia User Store                   │
 * │  4. 清除内存中的标签页状态（useTagsView）    │
 * │  5. 重置面包屑标签状态                       │
 * │  6. 跳转到登录页                             │
 * └─────────────────────────────────────────────┘
 *
 * 使用方式：
 * // 在 main.js 中注册（应用启动时执行一次）
 * import { registerAuthRuntimeHandlers } from '@/utils/authSession'
 * registerAuthRuntimeHandlers()
 */

import router from '../router'
import { to } from '@/utils/async'
import { setAuthExpiredHandler } from './authRuntime'
import { useUserStore } from '@/stores/user'
import { pinia } from '@/stores'

// ==================== 清理函数集合 ====================

/**
 * 清除 localStorage 中的标签页相关缓存
 *
 * 删除以下前缀的 key：
 * - beilit.visited-views: 已访问页面记录
 * - ruoyi-like-visited-views: 兼容旧版缓存
 * - beilit.tab-session-id: 标签页会话 ID
 * - beilit.tags-view: 标签页配置
 */
const clearTabCache = () => {
  const prefixes = [
    'beilit.visited-views:',
    'ruoyi-like-visited-views',
    'beilit.tab-session-id',
    'beilit.tags-view',
  ]

  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

/** 清除所有 sessionStorage 数据 */
const clearSessionStorage = () => {
  sessionStorage.clear()
}

/** 清除 Pinia 用户 Store 中的会话数据 */
const clearPiniaStore = () => {
  useUserStore(pinia).clearSession()
}

/**
 * 清除内存中的标签页和面包屑状态
 *
 * 动态导入 composable 避免循环依赖，
 * 捕获异常防止模块不存在时报错
 */
const clearTabsMemoryState = async () => {
  try {
    const { useTagsView } = await import('@/composables/useTagsView')
    const tagsView = useTagsView()
    tagsView.removeAllViews()
  } catch {
    // ignore: useTagsView 可能未加载
  }

  try {
    const { useBreadcrumbTabs } = await import(
      '@/composables/useBreadcrumbTabs'
    )
    const tabs = useBreadcrumbTabs()
    if (tabs.resetAll) tabs.resetAll()
  } catch {
    // ignore: useBreadcrumbTabs 可能未加载
  }
}

// ==================== 公开 API ====================

/**
 * 完整的认证清除 & 跳转流程
 *
 * 按顺序执行所有清理操作，最后跳转到登录页
 * 用于：Token 过期、被强制下线等场景
 */
export const clearAuthAndRedirect = async () => {
  clearTabCache()
  clearSessionStorage()
  clearPiniaStore()
  await clearTabsMemoryState()

  router.replace('/login').catch(() => {})
}

/**
 * 认证过期处理函数
 *
 * 作为 authRuntime.js 的回调，当 401 发生时自动调用
 */
export const handleAuthExpired = () => clearAuthAndRedirect()

/**
 * 注册认证运行时处理器
 *
 * 在 main.js 中调用，将 handleAuthExpired 注册到 authRuntime
 * 之后 request.js 收到 401 时会自动触发此处理流程
 */
export const registerAuthRuntimeHandlers = () => {
  setAuthExpiredHandler(handleAuthExpired)
}

/**
 * 用户主动登出
 *
 * 与被动过期的区别：
 * - 会先调用后端 logout 接口清除服务端 Session
 * - 再执行本地清理和跳转
 */
export const logoutByUser = async () => {
  await to(useUserStore(pinia).logout())
  await clearAuthAndRedirect()
}

export default {
  clearAuthAndRedirect,
  handleAuthExpired,
  logoutByUser,
  registerAuthRuntimeHandlers,
}
