let authExpiredHandler = null

export const setAuthExpiredHandler = (handler) => {
  authExpiredHandler = typeof handler === 'function' ? handler : null
}

export const triggerAuthExpired = (reasonCode) => {
  authExpiredHandler?.(reasonCode)
}
