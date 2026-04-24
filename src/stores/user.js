import { defineStore } from 'pinia'
import authApi from '@/api/auth'

let restorePromise = null

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    permissions: [],
    menu: [],
    hydrated: false,
    loading: false,
    authError: null
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.user?.id),
    username: (state) => state.user?.username || '',
    role: (state) => state.user?.role || '',
    displayName: (state) => state.user?.name || state.user?.username || '',
    isAdmin: (state) => state.user?.role === 'admin',
    isGuest: (state) => state.user?.role === 'guest',
    hasPermission: (state) => (permission) => {
      if (!permission) return true
      return state.permissions.includes(permission)
    }
  },

  actions: {
    setSession(payload = {}) {
      this.user = payload.user || null
      this.permissions = Array.isArray(payload.permissions) ? payload.permissions : []
      this.menu = Array.isArray(payload.menu) ? payload.menu : []
      this.hydrated = true
      this.authError = null
    },

    clearSession() {
      this.user = null
      this.permissions = []
      this.menu = []
      this.hydrated = true
      this.authError = null
    },

    async login(credentials) {
      this.loading = true
      try {
        const response = await authApi.login(credentials)
        this.setSession(response.data)
        return response.data
      } catch (error) {
        this.authError = error?.response?.data?.message || error?.message || '登录失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    async register(payload) {
      const response = await authApi.register(payload)
      return response.data
    },

    async restoreSession(force = false) {
      if (!force && this.hydrated) {
        return this.user
      }

      if (!force && restorePromise) {
        return restorePromise
      }

      restorePromise = authApi.getProfile()
        .then((response) => {
          this.setSession(response.data)
          return this.user
        })
        .catch((error) => {
          if (error?.response?.status === 401) {
            this.clearSession()
            return null
          }

          this.hydrated = true
          throw error
        })
        .finally(() => {
          restorePromise = null
        })

      return restorePromise
    },

    async refreshProfile() {
      return this.restoreSession(true)
    },

    async logout() {
      try {
        await authApi.logout()
      } finally {
        this.clearSession()
      }
    }
  }
})
