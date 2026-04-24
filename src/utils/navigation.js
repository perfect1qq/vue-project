import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { pinia } from '@/stores'

let routerInstance = null

const getRouter = () => {
  if (!routerInstance) {
    routerInstance = useRouter()
  }
  return routerInstance
}

export const readCurrentUser = () => {
  const store = useUserStore(pinia)
  return store.user || { role: 'guest' }
}

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
      minute: '2-digit'
    })
  } catch {
    return String(dateStr)
  }
}

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
  '/user-management': () => '用户管理'
}

export const resolveRouteDisplayTitle = (route) => {
  const path = route?.path || route || ''

  if (ROUTE_TITLE_MAP[path]) {
    return ROUTE_TITLE_MAP[path](route)
  }

  if (route?.meta?.title) {
    return route.meta.title
  }

  const match = Object.keys(ROUTE_TITLE_MAP).find((key) => path.startsWith(key))
  return match ? ROUTE_TITLE_MAP[match](route) : path.split('/').pop() || '页面'
}

export const getMessagePageTitle = (role) => (role === 'admin' ? '留言管理' : '我的留言')

export const navigateTo = (path, params = {}) => {
  const router = getRouter()
  if (Object.keys(params).length > 0) {
    router.push({ path, query: params })
  } else {
    router.push(path)
  }
}

export const openInNewTab = (url) => window.open(url, '_blank')

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
  getMessagePageTitle
}
