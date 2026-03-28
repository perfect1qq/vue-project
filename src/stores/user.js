import { defineStore } from 'pinia'
import axios from 'axios'
import jwtDecode from 'jwt-decode'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null
  }),
  actions: {
    init() {
      if (this.token) {
        axios.defaults.headers.common.Authorization = `Bearer ${this.token}`
        try { this.user = jwtDecode(this.token) } catch (e) { this.logout() }
      }
    },
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
      axios.defaults.headers.common.Authorization = `Bearer ${token}`
      this.user = jwtDecode(token)
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      delete axios.defaults.headers.common.Authorization
    }
  }
})
