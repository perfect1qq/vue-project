/**
 * @module composables/useBreadcrumbTabs
 * @description 面包屑标签页管理组合式函数
 *
 * 功能说明：
 * - 管理多标签页浏览状态（类似浏览器标签页）
 * - 支持标签页的增删、切换、关闭其他/左侧/右侧
 * - 按用户账号隔离存储（不同用户看到各自的标签页）
 * - 标签页数据持久化到 localStorage
 * - 支持新标签页会话检测（避免跨标签页串数据）
 * - 路由变化时自动同步当前激活标签
 *
 * 数据隔离策略：
 * ┌─────────────────────────────────────────────────────┐
 * │  localStorage Key 格式：                            │
 * │  beilit.visited-views:{userId}                      │
 * │                                                     │
 * │  示例：                                             │
 * │  - 用户 A (id=1): beilit.visited-views:1            │
 * │  - 用户 B (id=2): beilit.visited-views:2            │
 * │  - 游客:      beilit.visited-views:anonymous        │
 * └─────────────────────────────────────────────────────┘
 *
 * 会话管理：
 * - 使用 sessionStorage 生成唯一 session ID
 * - 新标签页打开时检测到新 session，清除旧缓存
 * - 避免同一用户在多个浏览器标签页间数据冲突
 *
 * 标签页操作：
 * ┌──────────┬─────────────────────────────────────────┐
 * │  操作     │  说明                                   │
 * ├──────────┼─────────────────────────────────────────┤
 * │  addView │  添加新标签（路由跳转时自动触发）         │
 * │  goView  │  切换到指定标签                          │
 * │  closeView   │  关闭单个标签                        │
 * │  closeOthers │  关闭除当前外的所有标签               │
 * │  closeLeft   │  关闭左侧所有标签                    │
 * │  closeRight  │  关闭右侧所有标签                    │
 * │  closeAll    │  关闭所有标签（保留首页）             │
 * │  resetAll    │  重置并清除缓存                      │
 * └──────────┴─────────────────────────────────────────┘
 *
 * @example
 * // 在布局组件中使用
 * const {
 *   visitedViews,
 *   currentView,
 *   activeFullPath,
 *   addView,
 *   closeView,
 *   closeOthers
 * } = useBreadcrumbTabs()
 *
 * // 渲染标签页列表
 * <el-tabs v-model="activeFullPath">
 *   <el-tab-pane
 *     v-for="view in visitedViews"
 *     :key="view.fullPath"
 *     :label="view.title"
 *     :name="view.fullPath"
 *     closable
 *   />
 * </el-tabs>
 */

import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveRouteDisplayTitle, readCurrentUser } from '@/utils/navigation'

/** localStorage 键前缀 */
const STORAGE_PREFIX = 'beilit.visited-views'

/** sessionStorage 中存储的 session ID 键名 */
const SESSION_KEY = 'beilit.tab-session-id'

/** 首页视图常量（不可关闭） */
const HOME_VIEW = Object.freeze({
  path: '/home',
  fullPath: '/home',
  title: '首页',
  name: 'Home',
  query: {},
  hash: ''
})

/** 全局响应式状态（单例模式，所有组件共享同一份状态） */
const state = reactive({
  visitedViews: [HOME_VIEW],
  activeFullPath: '/home',
  userKey: 'anonymous'
})

/** 是否已完成初始化 */
let initialized = false

/**
 * 解析当前用户的唯一标识
 *
 * 优先级：id > username > 'anonymous'
 * 用于生成用户专属的 localStorage key
 *
 * @returns {string} 用户唯一标识字符串
 */
const resolveUserKey = () => {
  const user = readCurrentUser()
  return String(user?.id ?? user?.username ?? 'anonymous')
}

/**
 * 生成当前账号对应的 localStorage 缓存 key
 *
 * @param {string} [userKey] - 用户标识，不传则自动解析
 * @returns {string} 完整的 storage key
 */
const getStorageKey = (userKey = resolveUserKey()) => `${STORAGE_PREFIX}:${userKey}`

/**
 * 安全深拷贝对象
 * 失败时返回空对象，避免程序崩溃
 *
 * @param {*} value - 要拷贝的值
 * @returns {Object} 拷贝后的对象
 */
const safeClone = (value) => {
  try {
    return JSON.parse(JSON.stringify(value || {}))
  } catch {
    return {}
  }
}

/**
 * 将路由对象规范化为视图对象
 *
 * 统一处理 route 对象和普通对象的差异，
 * 提取 path、fullPath、title、query 等字段
 *
 * @param {Object} routeLike - 路由对象或类路由对象
 * @returns {Object} 规范化后的视图对象
 */
const normalizeView = (routeLike) => {
  const route = routeLike || {}
  const path = route.path || HOME_VIEW.path
  return {
    path,
    fullPath: route.fullPath || path,
    title: resolveRouteDisplayTitle(route),
    name: route.name ? String(route.name) : '',
    query: safeClone(route.query),
    hash: route.hash || ''
  }
}

/**
 * 去重并确保首页在第一位
 *
 * 处理从 localStorage 加载的数据：
 * - 过滤无效项（null、login、register 页面）
 * - 按 fullPath 去重
 * - 确保首页始终在第一个位置
 *
 * @param {Array} list - 原始视图列表
 * @returns {Array} 清洗后的视图列表
 */
const dedupeAndFixHome = (list) => {
  const result = [HOME_VIEW]
  const seen = new Set([HOME_VIEW.fullPath])

  for (const item of list || []) {
    if (!item || !item.path || item.path === '/login' || item.path === '/register') continue
    const view = {
      path: item.path,
      fullPath: item.fullPath || item.path,
      title: item.title || item.label || '未命名页面',
      name: item.name || '',
      query: safeClone(item.query),
      hash: item.hash || ''
    }
    if (seen.has(view.fullPath)) continue
    seen.add(view.fullPath)
    result.push(view)
  }

  return result
}

/**
 * 检测是否为新开的浏览器标签页
 *
 * 通过 sessionStorage 中的 session ID 判断：
 * - 如果没有 session ID → 新标签页，创建 ID 并返回 true
 * - 如果已有 session ID → 已存在的标签页，返回 false
 *
 * @returns {boolean} 是否为新标签页
 */
const isNewTabSession = () => {
  if (typeof window === 'undefined') return false
  const existing = window.sessionStorage.getItem(SESSION_KEY)
  if (!existing) {
    const sessionId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    window.sessionStorage.setItem(SESSION_KEY, sessionId)
    return true
  }
  return false
}

/**
 * 清除指定用户的过期标签缓存
 *
 * 在新标签页检测到时调用，
 * 避免使用上一次关闭浏览器时的旧数据
 *
 * @param {string} userKey - 用户标识
 */
const clearStaleTabs = (userKey) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(getStorageKey(userKey))
  } catch {
    // ignore
  }
}

/**
 * 从 localStorage 加载用户的标签页列表
 *
 * 加载逻辑：
 * 1. 如果是新标签页 → 返回空列表（只显示首页）
 * 2. 否则从 localStorage 读取并去重清洗
 *
 * @param {string} userKey - 用户标识
 * @returns {Array} 视图列表
 */
const loadViews = (userKey) => {
  if (typeof window === 'undefined') return [HOME_VIEW]

  if (isNewTabSession()) {
    clearStaleTabs(userKey)
    return [HOME_VIEW]
  }

  try {
    const saved = window.localStorage.getItem(getStorageKey(userKey))
    if (!saved) return [HOME_VIEW]
    const parsed = JSON.parse(saved)
    return dedupeAndFixHome(Array.isArray(parsed) ? parsed : [])
  } catch {
    return [HOME_VIEW]
  }
}

/**
 * 持久化当前标签页列表到 localStorage
 *
 * 自动使用当前用户标识作为 key 后缀
 */
const persistViews = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getStorageKey(state.userKey), JSON.stringify(state.visitedViews))
  } catch {
    // ignore storage errors
  }
}

/**
 * 同步用户上下文
 *
 * 当检测到用户变更时（如登录/切换账号）：
 * - 更新 userKey
 * - 重新加载该用户的标签页数据
 * - 避免不同账号间的数据混淆
 *
 * @param {Object} route - 当前路由对象
 */
const syncUserContext = (route) => {
  const currentKey = resolveUserKey()
  if (state.userKey === currentKey && initialized) return

  state.userKey = currentKey
  state.visitedViews = loadViews(currentKey)
  state.activeFullPath = route?.fullPath || HOME_VIEW.fullPath
  initialized = true
}

/**
 * 确保当前路由在已访问列表中存在
 *
 * 如果不存在则添加，如果已存在则更新其信息
 *
 * @param {Object} route - 当前路由对象
 * @returns {Object} 当前视图对象
 */
const ensureCurrentExists = (route) => {
  const current = normalizeView(route)
  const index = state.visitedViews.findIndex(item => item.fullPath === current.fullPath)
  if (index === -1) {
    state.visitedViews.push(current)
  } else {
    state.visitedViews[index] = { ...state.visitedViews[index], ...current }
  }
  persistViews()
  return current
}

/**
 * 从已访问列表中获取当前路由对应的视图
 *
 * @param {Object} route - 路由对象
 * @returns {Object} 视图对象，未找到则返回规范化后的路由
 */
const getCurrent = (route) => state.visitedViews.find(item => item.fullPath === route.fullPath) || normalizeView(route)

/**
 * 重置面包屑标签状态（退出登录时调用）
 *
 * 清空所有标签页数据并删除 localStorage 缓存
 * 防止下一个登录用户看到上一个用户的标签页
 */
export function resetBreadcrumbTabs() {
  state.visitedViews = [HOME_VIEW]
  state.activeFullPath = HOME_VIEW.fullPath
  state.userKey = 'anonymous'
  initialized = false
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(getStorageKey())
    } catch {
      // ignore
    }
  }
}

/**
 * 创建面包屑标签页管理实例
 *
 * @returns {Object} 标签页管理状态和方法集合
 * @returns {import('vue').ComputedRef<Array>} returns.visitedViews - 已访问的视图列表
 * @returns {import('vue').ComputedRef<Object>} returns.currentView - 当前激活的视图
 * @returns {import('vue').ComputedRef<string>} returns.activeFullPath - 当前激活路径
 * @returns {Function} returns.addView - 添加新视图
 * @returns {Function} returns.goView - 跳转到指定视图
 * @returns {Function} returns.closeView - 关闭指定视图
 * @returns {Function} returns.closeOthers - 关闭其他视图
 * @returns {Function} returns.closeLeft - 关闭左侧视图
 * @returns {Function} returns.closeRight - 关闭右侧视图
 * @returns {Function} returns.closeAll - 关闭所有视图
 * @returns {Function} returns.resetAll - 重置所有状态
 */
export function useBreadcrumbTabs() {
  const route = useRoute()
  const router = useRouter()

  syncUserContext(route)

  /** 已访问的视图列表（计算属性，响应式更新） */
  const visitedViews = computed(() => state.visitedViews)

  /** 当前激活的视图对象 */
  const currentView = computed(() => getCurrent(route))

  /** 当前激活路径（用于 el-tabs 的 v-model 绑定） */
  const activeFullPath = computed(() => route.fullPath)

  /**
   * 添加新视图到标签列表
   *
   * 通常不需要手动调用，路由变化时会自动触发
   * 过滤 login 和 register 页面，不允许添加到标签列表
   *
   * @param {Object} routeLike - 要添加的路由对象
   * @returns {Object} 添加或更新的视图对象
   */
  const addView = (routeLike) => {
    syncUserContext(routeLike)
    if (!routeLike || routeLike.path === '/login' || routeLike.path === '/register') return HOME_VIEW
    return ensureCurrentExists(routeLike)
  }

  /**
   * 跳转到指定视图
   *
   * 如果目标就是当前页面则不执行跳转
   *
   * @param {Object} view - 目标视图对象
   */
  const goView = async (view) => {
    if (!view) return
    const target = {
      path: view.path,
      query: view.query || undefined,
      hash: view.hash || undefined
    }
    if (route.fullPath === view.fullPath) return
    await router.push(target)
  }

  /**
   * 关闭指定视图
   *
   * 如果关闭的是当前激活的标签页，
   * 则自动跳转到最后一个标签或相邻标签
   *
   * @param {Object} view - 要关闭的视图对象
   */
  const closeView = async (view) => {
    if (!view || view.path === HOME_VIEW.path) return

    const index = state.visitedViews.findIndex(item => item.fullPath === view.fullPath)
    if (index === -1) return

    const isCurrent = route.fullPath === view.fullPath
    state.visitedViews.splice(index, 1)
    persistViews()

    if (isCurrent) {
      const nextView = state.visitedViews[index] || state.visitedViews[index - 1] || HOME_VIEW
      await router.push({
        path: nextView.path,
        query: nextView.query || undefined,
        hash: nextView.hash || undefined
      })
    }
  }

  /**
   * 关闭除指定视图外的所有其他视图
   *
   * 始终保留首页和目标视图
   * 如果当前不在目标视图上，则自动跳转过去
   *
   * @param {Object} [view] - 要保留的视图，默认为当前视图
   */
  const closeOthers = async (view) => {
    const target = view || currentView.value
    if (!target) return

    state.visitedViews = state.visitedViews.filter(item => item.path === HOME_VIEW.path || item.fullPath === target.fullPath)
    persistViews()

    if (route.fullPath !== target.fullPath) {
      await router.push({
        path: target.path,
        query: target.query || undefined,
        hash: target.hash || undefined
      })
    }
  }

  /**
   * 关闭指定视图左侧的所有标签
   *
   * 始终保留首页和目标视图及其右侧的标签
   * 如果目标是第二个位置及以内则不执行
   *
   * @param {Object} [view] - 目标视图，默认为当前视图
   */
  const closeLeft = (view) => {
    const target = view || currentView.value
    if (!target) return

    const targetIndex = state.visitedViews.findIndex(item => item.fullPath === target.fullPath)
    if (targetIndex <= 1) return

    state.visitedViews = [
      HOME_VIEW,
      ...state.visitedViews.filter((item, index) => index === targetIndex || index > targetIndex)
    ]
    persistViews()
  }

  /**
   * 关闭指定视图右侧的所有标签
   *
   * 保留首页到目标视图之间的所有标签
   *
   * @param {Object} [view] - 目标视图，默认为当前视图
   */
  const closeRight = (view) => {
    const target = view || currentView.value
    if (!target) return

    const targetIndex = state.visitedViews.findIndex(item => item.fullPath === target.fullPath)
    if (targetIndex === -1) return

    state.visitedViews = state.visitedViews.filter((item, index) => index === 0 || index <= targetIndex)
    persistViews()
  }

  /**
   * 关闭所有标签页（仅保留首页）
   *
   * 如果当前不在首页，则自动跳转到首页
   */
  const closeAll = async () => {
    state.visitedViews = [HOME_VIEW]
    persistViews()
    if (route.path !== HOME_VIEW.path) {
      await router.push(HOME_VIEW.path)
    }
  }

  /**
   * 重置所有标签状态并清除本地缓存
   *
   * 与 resetBreadcrumbTabs() 不同的是：
   * - resetBreadcrumbTabs 是导出的独立函数（供 authSession 调用）
   * - resetAll 是实例方法（供组件内部调用）
   */
  const resetAll = () => {
    state.visitedViews = [HOME_VIEW]
    state.activeFullPath = HOME_VIEW.fullPath
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(getStorageKey(state.userKey))
      } catch {
        // ignore
      }
    }
  }

  /**
   * 监听路由变化，自动同步标签状态
   *
   * 当用户通过浏览器前进/后退按钮导航时，
   * 自动将新路由添加到标签列表并设为激活状态
   */
  watch(
    () => route.fullPath,
    () => {
      syncUserContext(route)
      addView(route)
    },
    { immediate: true }
  )

  return {
    visitedViews,
    currentView,
    activeFullPath,
    addView,
    goView,
    closeView,
    closeOthers,
    closeLeft,
    closeRight,
    closeAll,
    resetAll
  }
}
