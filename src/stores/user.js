import { defineStore } from 'pinia'
import axios from 'axios'

/**
 * 安全地解析 JWT payload。
 * 这里只需要读出用户基本信息，不依赖额外三方包，避免构建期缺少依赖。
 * @param {string} token - JWT 字符串
 * @returns {object|null}
 */
function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = typeof window !== 'undefined' && window.atob
      ? window.atob(padded)
      : Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null
  }),
  actions: {
    init() {
      if (this.token) {
        axios.defaults.headers.common.Authorization = `Bearer ${this.token}`
        const decoded = decodeJwtPayload(this.token)
        if (decoded) this.user = decoded
        else this.logout()
      }
    },
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      this.user = decodeJwtPayload(token)
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      delete axios.defaults.headers.common.Authorization
    }
  }
})
