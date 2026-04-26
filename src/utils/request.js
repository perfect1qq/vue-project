/**
 * @file utils/request.js
 * @description HTTP 请求封装（基于 Axios 的增强版请求工具）
 *
 * 功能说明：
 * - 在 api/http.js 基础上增加完整的拦截器功能
 * - 提供请求去重、自动重试、错误处理、401 跳转等能力
 * - 所有 API 调用应优先使用此模块，而非直接使用 http.js
 *
 * 核心能力：
 * ┌────────────────────────────────────────────────────────────┐
 * │  请求拦截器                                                  │
 * │  ├─ GET 请求自动添加时间戳参数（防缓存）                      │
 * │  ├─ 相同请求自动取消上一个（防重复提交）                      │
 * │  └─ AbortController 支持（可手动取消）                       │
 * ├────────────────────────────────────────────────────────────┤
 * │  响应拦截器                                                  │
 * │  ├─ 成功：标准化响应格式（提取 data 字段）                    │
 * │  ├─ 业务失败：抛出 Error 对象                                │
 * │  ├─ 401 错误：触发认证过期处理                               │
 * │  ├─ 可重试错误：自动重试 GET 请求                            │
 * │  └─ 其他错误：显示用户友好提示                               │
 * └────────────────────────────────────────────────────────────┘
 *
 * 使用示例：
 * import request from '@/utils/request'
 *
 * // GET 请求（带缓存破坏）
 * const data = await request.get('/api/users')
 *
 * // POST 请求（自动取消重复请求）
 * await request.post('/api/users', { name: 'test' })
 *
 * // 手动取消请求
 * const controller = new AbortController()
 * request.get('/api/data', { signal: controller.signal })
 * controller.abort() // 取消请求
 */

import axios from 'axios'
import http from '../api/http'
import { triggerAuthExpired } from './authRuntime'

/** 请求配置常量 */
const CONFIG = {
  /** 请求超时时间（毫秒）：15 秒 */
  timeout: 15000,
  /** 自动重试次数 */
  retryCount: 1,
  /**
   * 可重试的 HTTP 状态码集合
   * 包含：网络断开(0)、服务器内部错误(500)、网关错误(502/503/504)
   */
  retryableStatuses: new Set([0, 500, 502, 503, 504]),
}

/**
 * HTTP 状态码 → 用户友好提示消息映射表
 *
 * 用于在请求失败时显示中文错误提示
 */
const ERROR_MESSAGES = {
  400: '请求参数错误，请检查输入',
  401: '登录已失效，请重新登录',
  403: '没有权限执行此操作',
  404: '请求的资源不存在',
  408: '请求超时，请稍后重试',
  409: '数据冲突，请刷新后重试',
  422: '数据校验失败，请检查输入格式',
  429: '请求过于频繁，请稍后再试',
  500: '服务器内部错误，请联系管理员',
  502: '网关错误，服务暂时不可用',
  503: '服务维护中，请稍后重试',
  504: '网关超时，请稍后重试',
}

/**
 * 从错误对象中提取用户友好的错误消息
 *
 * 优先级：
 * 1. 用户主动取消的请求 → 返回空字符串（不显示）
 * 2. 服务端返回的消息（长度 < 100 的短消息）
 * 3. 预定义的状态码映射消息
 * 4. 兜底消息："请求失败 (状态码)"
 *
 * @param {Error} error - Axios 错误对象
 * @returns {string} 格式化后的错误消息
 */
const getErrorMessage = (error) => {
  if (error?.code === 'ERR_CANCELED') return ''

  const status = Number(error?.response?.status || 0)
  const serverMessage = error?.response?.data?.message

  if (
    serverMessage &&
    typeof serverMessage === 'string' &&
    serverMessage.length < 100
  ) {
    return serverMessage
  }

  return ERROR_MESSAGES[status] || `请求失败 (${status || '网络异常'})`
}

// ==================== 请求去重机制 ====================

/**
 * 存储正在进行的请求控制器
 *
 * key: 由 method + url + params + data 生成的唯一标识
 * value: AbortController 实例（用于取消请求）
 */
const pendingControllers = new Map()

/**
 * 序列化请求参数的一部分值
 *
 * 将任意类型的值转换为稳定的字符串表示：
 * - null/undefined → 空字符串
 * - string → 原样返回
 * - 其他基本类型 → JSON.stringify
 * - object → 递归序列化（排序 key 保证一致性）
 * - FormData → 固定占位符 '[form-data]'
 * - Array → 递归序列化为 [item1,item2,...]
 *
 * @param {*} value - 需要序列化的值
 * @returns {string} 序列化后的字符串
 */
const serializeRequestPart = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return JSON.stringify(value)

  if (value instanceof URLSearchParams) {
    return JSON.stringify(
      [...value.entries()].sort(([a], [b]) => a.localeCompare(b)),
    )
  }

  if (value instanceof FormData) {
    return '[form-data]'
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeRequestPart(item)).join(',')}]`
  }

  const entries = Object.entries(value)
    .filter(([key, item]) => !(key === '_t' && item !== undefined))
    .sort(([a], [b]) => a.localeCompare(b))

  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${serializeRequestPart(item)}`).join(',')}}`
}

/**
 * 为请求配置生成唯一标识键
 *
 * 组成部分：method:url:params:data
 * 用于检测和取消重复请求
 *
 * @param {Object} config - Axios 请求配置
 * @returns {string} 请求唯一标识
 */
const generateRequestKey = (config) => {
  const method = String(config?.method || 'get').toLowerCase()
  const url = config?.url || ''
  const params = serializeRequestPart(config?.params)
  const data = method === 'get' ? '' : serializeRequestPart(config?.data)
  return `${method}:${url}:${params}:${data}`
}

/**
 * 取消指定标识的待处理请求
 *
 * 如果存在相同标识的上一个请求，则调用 abort() 取消它
 *
 * @param {string} requestKey - 请求唯一标识
 * @returns {boolean} 是否成功取消了某个请求
 */
const cancelPendingRequest = (requestKey) => {
  const controller = pendingControllers.get(requestKey)
  if (controller) {
    controller.abort()
    pendingControllers.delete(requestKey)
    return true
  }
  return false
}

/**
 * 清除所有待处理的请求
 *
 * 在页面切换或组件卸载时调用，防止已卸载组件的回调执行
 */
export const clearAllPendingRequests = () => {
  for (const [key, controller] of pendingControllers.entries()) {
    controller.abort()
    pendingControllers.delete(key)
  }
}

// ==================== Axios 实例创建 & 拦截器注册 ====================

/** 增强版 Axios 实例 */
const service = axios.create({
  baseURL: http.defaults.baseURL,
  timeout: CONFIG.timeout,
  withCredentials: true,
})

service.interceptors.request.use((config) => {
  const method = String(config?.method || 'get').toLowerCase()

  // GET 请求添加时间戳参数防止浏览器缓存
  if (method === 'get' && !config.disableCacheBust) {
    config.params = { ...(config.params || {}), _t: Date.now() }
  }

  // 请求去重：取消相同的上一个请求
  if (!config.skipCancel) {
    const requestKey = generateRequestKey(config)
    cancelPendingRequest(requestKey)

    const controller = new AbortController()
    config.signal = controller.signal
    pendingControllers.set(requestKey, controller)
  }

  return config
})

service.interceptors.response.use(
  (response) => {
    const config = response?.config || {}

    if (!config.skipCancel) {
      const requestKey = generateRequestKey(config)
      pendingControllers.delete(requestKey)
    }

    const payload = response?.data

    // 后端返回 success=false 时视为业务错误
    if (payload?.success === false) {
      const err = new Error(payload.message || '请求失败')
      err.code = payload.code
      err.response = response
      throw err
    }

    // 标准化响应：提取 data 字段
    if (
      payload?.success === true &&
      Object.prototype.hasOwnProperty.call(payload, 'data')
    ) {
      return { ...response, data: payload.data }
    }

    return response
  },
  async (error) => {
    const config = error?.config || {}

    if (!config.skipCancel && !error?.code?.includes('ERR_CANCELED')) {
      const requestKey = generateRequestKey(config)
      pendingControllers.delete(requestKey)
    }

    config.__retryCount = Number(config.__retryCount || 0)
    const status = Number(error?.response?.status || 0)
    const reasonCode = error?.response?.data?.code

    // 401 未授权 → 触发认证过期流程
    if (status === 401) {
      if (config.authRedirect !== false) {
        triggerAuthExpired(reasonCode)
      }
      return Promise.reject(error)
    }

    // 可重试错误 → 自动重试 GET 请求
    if (shouldRetry(error) && config.__retryCount < CONFIG.retryCount) {
      config.__retryCount += 1
      return service(config)
    }

    // 显示错误提示
    const errorMessage = getErrorMessage(error)

    if (errorMessage && !config.silent) {
      try {
        const { ElMessage } = await import('element-plus')
        ElMessage.error(errorMessage)
      } catch {
        console.error(
          '[Request Error]',
          JSON.stringify({
            message: errorMessage,
            status,
            code: reasonCode || error?.code || 'REQUEST_ERROR',
          }),
        )
      }
    }

    return Promise.reject(error)
  },
)

export default service
export { generateRequestKey }
