import axios from 'axios'
import http from '../api/http'
import { triggerAuthExpired } from './authRuntime'

const CONFIG = {
  timeout: 15000,
  retryCount: 1,
  retryableStatuses: new Set([0, 500, 502, 503, 504])
}

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
  504: '网关超时，请稍后重试'
}

const getErrorMessage = (error) => {
  if (error?.code === 'ERR_CANCELED') return ''

  const status = Number(error?.response?.status || 0)
  const serverMessage = error?.response?.data?.message

  if (serverMessage && typeof serverMessage === 'string' && serverMessage.length < 100) {
    return serverMessage
  }

  return ERROR_MESSAGES[status] || `请求失败 (${status || '网络异常'})`
}

const pendingControllers = new Map()

const serializeRequestPart = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return JSON.stringify(value)

  if (value instanceof URLSearchParams) {
    return JSON.stringify([...value.entries()].sort(([a], [b]) => a.localeCompare(b)))
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

const generateRequestKey = (config) => {
  const method = String(config?.method || 'get').toLowerCase()
  const url = config?.url || ''
  const params = serializeRequestPart(config?.params)
  const data = method === 'get' ? '' : serializeRequestPart(config?.data)
  return `${method}:${url}:${params}:${data}`
}

const cancelPendingRequest = (requestKey) => {
  const controller = pendingControllers.get(requestKey)
  if (controller) {
    controller.abort()
    pendingControllers.delete(requestKey)
    return true
  }
  return false
}

export const clearAllPendingRequests = () => {
  for (const [key, controller] of pendingControllers.entries()) {
    controller.abort()
    pendingControllers.delete(key)
  }
}

const service = axios.create({
  baseURL: http.defaults.baseURL,
  timeout: CONFIG.timeout,
  withCredentials: true
})

service.interceptors.request.use((config) => {
  const method = String(config?.method || 'get').toLowerCase()

  if (method === 'get' && !config.disableCacheBust) {
    config.params = { ...(config.params || {}), _t: Date.now() }
  }

  if (!config.skipCancel) {
    const requestKey = generateRequestKey(config)
    cancelPendingRequest(requestKey)

    const controller = new AbortController()
    config.signal = controller.signal
    pendingControllers.set(requestKey, controller)
  }

  return config
})

const shouldRetry = (error) => {
  const status = Number(error?.response?.status || 0)
  const method = String(error?.config?.method || 'get').toLowerCase()
  return method === 'get' && error?.code !== 'ERR_CANCELED' && (!status || CONFIG.retryableStatuses.has(status))
}

service.interceptors.response.use(
  (response) => {
    const config = response?.config || {}

    if (!config.skipCancel) {
      const requestKey = generateRequestKey(config)
      pendingControllers.delete(requestKey)
    }

    const payload = response?.data

    if (payload?.success === false) {
      const err = new Error(payload.message || '请求失败')
      err.code = payload.code
      err.response = response
      throw err
    }

    if (payload?.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
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

    if (status === 401) {
      if (config.authRedirect !== false) {
        triggerAuthExpired(reasonCode)
      }
      return Promise.reject(error)
    }

    if (shouldRetry(error) && config.__retryCount < CONFIG.retryCount) {
      config.__retryCount += 1
      return service(config)
    }

    const errorMessage = getErrorMessage(error)

      if (errorMessage && !config.silent) {
        try {
          const { ElMessage } = await import('element-plus')
          ElMessage.error(errorMessage)
        } catch {
          console.error('[Request Error]', JSON.stringify({
            message: errorMessage,
            status,
            code: reasonCode || error?.code || 'REQUEST_ERROR'
          }))
        }
      }

    return Promise.reject(error)
  }
)

export default service
export { generateRequestKey }
