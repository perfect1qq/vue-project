import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const STORAGE_KEY = 'ruoyi-like-visited-views'
const HOME_VIEW = Object.freeze({
  path: '/home',
  fullPath: '/home',
  title: '首页',
  name: 'Home',
  query: {},
  hash: ''
})

const state = reactive({
  visitedViews: []
})

let initialized = false
let persistTimer = null

const safeClone = (value) => {
  try {
    return JSON.parse(JSON.stringify(value || {}))
  } catch {
    return {}
  }
}

const getRouteTitle = (route) => {
  const metaTitle = route?.meta?.title
  if (metaTitle) return String(metaTitle)

  const matchedTitle = [...(route?.matched || [])]
    .reverse()
    .find(record => record?.meta?.title)?.meta?.title

  if (matchedTitle) return String(matchedTitle)

  if (route?.name) return String(route.name)
  return route?.path ? String(route.path) : '未命名页面'
}

const normalizeView = (routeLike) => {
  const route = routeLike || {}
  const path = route.path || HOME_VIEW.path
  return {
    path,
    fullPath: route.fullPath || path,
    title: getRouteTitle(route),
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
      title: item.title || item.label || getRouteTitle(item),
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

const loadViews = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return [HOME_VIEW]
    const parsed = JSON.parse(saved)
    return dedupeAndFixHome(Array.isArray(parsed) ? parsed : [])
  } catch {
    return [HOME_VIEW]
  }
}

const persistViews = () => {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.visitedViews))
    } catch {
      // ignore storage errors
    }
  }, 0)
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

export function useBreadcrumbTabs() {
  const route = useRoute()
  const router = useRouter()

  if (!initialized) {
    state.visitedViews = loadViews()
    initialized = true
  }

  const visitedViews = computed(() => state.visitedViews)
  const currentView = computed(() => getCurrent(route))
  const activeFullPath = computed(() => route.fullPath)

  const addView = (routeLike) => {
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

  watch(
    () => route.fullPath,
    () => {
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
    closeAll
  }
}
