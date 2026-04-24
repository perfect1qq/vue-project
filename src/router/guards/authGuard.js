import { useUserStore } from '@/stores/user'
import { pinia } from '@/stores'
import { isPublicRegisterEnabled } from '@/utils/runtimeConfig'

const PERMISSION_FALLBACKS = {
  'quotation:write': '/quotation/history',
  'beam:write': '/beam-quotation/history'
}

export const applyAuthGuard = async (to) => {
  const userStore = useUserStore(pinia)

  if (to.meta.public) {
    if (to.path === '/register' && !isPublicRegisterEnabled) {
      return '/login'
    }

    try {
      await userStore.restoreSession()
    } catch {
      // keep public routes accessible when profile probing fails
    }

    if (userStore.isLoggedIn && (to.path === '/login' || to.path === '/register')) {
      return '/'
    }
    return true
  }

  let currentUser = null
  try {
    currentUser = await userStore.restoreSession()
  } catch {
    currentUser = null
  }

  if (!currentUser) {
    return '/login'
  }

  const requiredPermission = to.meta?.requiresPermission
  if (requiredPermission && !userStore.hasPermission(requiredPermission)) {
    return PERMISSION_FALLBACKS[requiredPermission] || '/'
  }

  return true
}
