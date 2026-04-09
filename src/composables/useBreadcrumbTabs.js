import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveRouteDisplayTitle, readCurrentUser } from '@/utils/navigation'

/**
 * 标签页缓存前缀。
 * 说明：不同账号使用不同的缓存 key，避免超级管理员与测试账号互相串页。
 */
const STORAGE_PREFIX = 'beilit.visited-views'

const HOME_VIEW = Object.freeze({
  path: '/home',
  fullPath: '/home',
  title: '首页',
  name: 'Home',
  query: {},
  hash: ''
})

const state = reactive({
  visitedViews: [HOME_VIEW],
  activeFullPath: '/home',
  userKey: 'anonymous'
})

let initialized = false

/**
 * 当前账号对应的唯一标识。
 * 优先用 id，其次 username，最后退回 anonymous。
 */
const resolveUserKey = () => {
  const user = readCurrentUser()
  return String(user?.id ?? user?.username ?? 'anonymous')
}

/**
 * 当前账号对应的标签页缓存 key。
 */
const getStorageKey = (userKey = resolveUserKey()) => `${STORAGE_PREFIX}:${userKey}`

const safeClone = (value) => {
  try {
    return JSON.parse(JSON.stringify(value || {}))
  } catch {
    return {}
  }
}

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

const loadViews = (userKey) => {
  if (typeof window === 'undefined') return [HOME_VIEW]
  try {
    const saved = window.localStorage.getItem(getStorageKey(userKey))
    if (!saved) return [HOME_VIEW]
    const parsed = JSON.parse(saved)
    return dedupeAndFixHome(Array.isArray(parsed) ? parsed : [])
  } catch {
    return [HOME_VIEW]
  }
}

const persistViews = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getStorageKey(state.userKey), JSON.stringify(state.visitedViews))
  } catch {
    // ignore storage errors
  }
}

const syncUserContext = (route) => {
  const currentKey = resolveUserKey()
  if (state.userKey === currentKey && initialized) return

  state.userKey = currentKey
  state.visitedViews = loadViews(currentKey)
  state.activeFullPath = route?.fullPath || HOME_VIEW.fullPath
  initialized = true
}

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

const getCurrent = (route) => state.visitedViews.find(item => item.fullPath === route.fullPath) || normalizeView(route)

/**
 * 清空当前账号的标签页缓存，并把状态重置到首页。
 * 退出登录时调用，避免账号之间串页。
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

export function useBreadcrumbTabs() {
  const route = useRoute()
  const router = useRouter()

  syncUserContext(route)

  const visitedViews = computed(() => state.visitedViews)
  const currentView = computed(() => getCurrent(route))
  const activeFullPath = computed(() => route.fullPath)

  const addView = (routeLike) => {
    syncUserContext(routeLike)
    if (!routeLike || routeLike.path === '/login' || routeLike.path === '/register') return HOME_VIEW
    return ensureCurrentExists(routeLike)
  }

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

  const closeRight = (view) => {
    const target = view || currentView.value
    if (!target) return

    const targetIndex = state.visitedViews.findIndex(item => item.fullPath === target.fullPath)
    if (targetIndex === -1) return

    state.visitedViews = state.visitedViews.filter((item, index) => index === 0 || index <= targetIndex)
    persistViews()
  }

  const closeAll = async () => {
    state.visitedViews = [HOME_VIEW]
    persistViews()
    if (route.path !== HOME_VIEW.path) {
      await router.push(HOME_VIEW.path)
    }
  }

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
