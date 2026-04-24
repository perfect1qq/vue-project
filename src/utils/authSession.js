import router from '../router'
import { to } from '@/utils/async'
import { setAuthExpiredHandler } from './authRuntime'
import { useUserStore } from '@/stores/user'
import { pinia } from '@/stores'

const clearTabCache = () => {
  const prefixes = [
    'beilit.visited-views:',
    'ruoyi-like-visited-views',
    'beilit.tab-session-id',
    'beilit.tags-view'
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

const clearSessionStorage = () => {
  sessionStorage.clear()
}

const clearPiniaStore = () => {
  useUserStore(pinia).clearSession()
}

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

export const clearAuthAndRedirect = async () => {
  clearTabCache()
  clearSessionStorage()
  clearPiniaStore()
  await clearTabsMemoryState()
  router.replace('/login').catch(() => {})
}

export const handleAuthExpired = () => clearAuthAndRedirect()

export const registerAuthRuntimeHandlers = () => {
  setAuthExpiredHandler(handleAuthExpired)
}

export const logoutByUser = async () => {
  await to(useUserStore(pinia).logout())
  await clearAuthAndRedirect()
}

export default {
  clearAuthAndRedirect,
  handleAuthExpired,
  logoutByUser,
  registerAuthRuntimeHandlers
}
