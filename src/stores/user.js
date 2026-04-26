/**
 * @file stores/user.js
 * @description 用户认证状态管理（Pinia Store）
 *
 * 功能说明：
 * - 管理用户登录状态、权限列表、菜单配置
 * - 提供登录、注册、登出、会话恢复等操作
 * - 支持页面刷新后的会话恢复（通过 Cookie 中的 Token）
 * - 防止并发重复请求（restoreSession 单例模式）
 *
 * 状态模型：
 * ┌─────────────────────────────────────────────────────┐
 * │  State（响应式状态）                                  │
 * │  ├─ user: { id, username, name, role }              │
 * │  ├─ permissions: string[] (如 ['user:manage'])      │
 * │  ├─ menu: object[] (动态菜单配置)                    │
 * │  ├─ hydrated: boolean (是否已完成初始化)             │
 * │  ├─ loading: boolean (请求进行中)                   │
 * │  └─ authError: string | null (错误消息)              │
 * ├─────────────────────────────────────────────────────┤
 * │  Getters（计算属性）                                 │
 * │  ├─ isLoggedIn: 是否已登录                           │
 * │  ├─ isAdmin: 是否为管理员                           │
 * │  ├─ isGuest: 是否为游客                             │
 * │  └─ hasPermission(perm): 是否拥有指定权限            │
 * ├─────────────────────────────────────────────────────┤
 * │  Actions（异步操作）                                 │
 * │  ├─ login(credentials): 登录                        │
 * │  ├─ register(payload): 注册                         │
 * │  ├─ restoreSession(): 恢复会话                      │
 * │  ├─ refreshProfile(): 刷新用户信息                  │
 * │  └─ logout(): 登出                                 │
 * └─────────────────────────────────────────────────────┘
 *
 * 使用示例：
 * const userStore = useUserStore()
 *
 * // 检查登录状态
 * if (userStore.isLoggedIn) console.log(userStore.displayName)
 *
 * // 权限检查
 * if (userStore.hasPermission('user:manage')) showAdminPanel()
 */

import { defineStore } from 'pinia'
import authApi from '@/api/auth'

/** 会话恢复 Promise 单例（防止并发重复请求） */
let restorePromise = null

export const useUserStore = defineStore('user', {
  state: () => ({
    /** 当前登录用户信息对象，未登录时为 null */
    user: null,
    /** 用户拥有的权限标识列表（从后端获取） */
    permissions: [],
    /** 动态菜单配置数组（预留扩展） */
    menu: [],
    /**
     * 水合完成标记
     * true: 已尝试获取用户信息（无论成功失败）
     * false: 尚未进行任何认证相关请求
     */
    hydrated: false,
    /** 登录/注册等操作的加载状态 */
    loading: false,
    /** 认证错误信息（用于显示给用户） */
    authError: null,
  }),

  getters: {
    /** 是否已登录（根据 user.id 判断） */
    isLoggedIn: (state) => Boolean(state.user?.id),

    /** 当前用户的登录名 */
    username: (state) => state.user?.username || '',

    /** 当前用户的角色（admin / user / guest） */
    role: (state) => state.user?.role || '',

    /** 显示名称：优先使用 name 字段，回退到 username */
    displayName: (state) => state.user?.name || state.user?.username || '',

    /** 是否为管理员角色 */
    isAdmin: (state) => state.user?.role === 'admin',

    /** 是否为游客角色（只读权限） */
    isGuest: (state) => state.user?.role === 'guest',

    /**
     * 权限检查函数
     * @param {string} permission - 权限标识（如 'user:manage'）
     * @returns {boolean} 是否拥有该权限（无参数时默认返回 true）
     */
    hasPermission: (state) => (permission) => {
      if (!permission) return true
      return state.permissions.includes(permission)
    },
  },

  actions: {
    /**
     * 设置用户会话数据
     *
     * 登录成功或会话恢复后调用
     *
     * @param {Object} [payload={}] - 会话数据
     * @param {Object} payload.user - 用户基本信息
     * @param {string[]} payload.permissions - 权限列表
     * @param {Object[]} payload.menu - 菜单配置
     */
    setSession(payload = {}) {
      this.user = payload.user || null
      this.permissions = Array.isArray(payload.permissions)
        ? payload.permissions
        : []
      this.menu = Array.isArray(payload.menu) ? payload.menu : []
      this.hydrated = true
      this.authError = null
    },

    /**
     * 清除用户会话数据
     *
     * 登出或 Token 失效时调用
     */
    clearSession() {
      this.user = null
      this.permissions = []
      this.menu = []
      this.hydrated = true
      this.authError = null
    },

    /**
     * 用户登录
     *
     * 发送凭据到后端验证，成功后设置会话数据
     *
     * @param {Object} credentials - 登录凭据
     * @param {string} credentials.username - 用户名
     * @param {string} credentials.password - 密码
     * @returns {Promise<Object>} 后端返回的用户数据
     * @throws {Error} 登录失败时抛出异常（含 authError）
     */
    async login(credentials) {
      this.loading = true
      try {
        const response = await authApi.login(credentials)
        this.setSession(response.data)
        return response.data
      } catch (error) {
        this.authError =
          error?.response?.data?.message || error?.message || '登录失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 用户注册
     *
     * @param {Object} payload - 注册信息
     * @returns {Promise<Object>} 注册结果
     */
    async register(payload) {
      const response = await authApi.register(payload)
      return response.data
    },

    /**
     * 恢复用户会话（页面刷新后重新获取用户信息）
     *
     * 特性：
     * - 已水合且非强制模式 → 直接返回当前用户
     * - 正在恢复中 → 返回已有的 Promise（防并发）
     * - 401 错误 → 自动清除会话
     *
     * @param {boolean} [force=false] - 是否强制刷新（忽略缓存）
     * @returns {Promise<Object|null>} 用户对象或 null（未登录）
     */
    async restoreSession(force = false) {
      if (!force && this.hydrated) {
        return this.user
      }

      if (!force && restorePromise) {
        return restorePromise
      }

      restorePromise = authApi
        .getProfile()
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

    /**
     * 刷新用户资料
     *
     * 强制从后端重新获取最新用户信息
     */
    async refreshProfile() {
      return this.restoreSession(true)
    },

    /**
     * 用户登出
     *
     * 调用后端登出接口清除服务端 Session，
     * 无论接口是否成功都清除本地状态
     */
    async logout() {
      try {
        await authApi.logout()
      } finally {
        this.clearSession()
      }
    },
  },
})
