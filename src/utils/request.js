import axios from 'axios'
import http from '../api/http'
const service = axios.create({
  baseURL: http.defaults.baseURL,
  timeout: 15000
})

service.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // 默认给 GET 请求追加时间戳，避免浏览器/中间缓存导致增删改后短时间读到旧数据。
  const method = String(config?.method || 'get').toLowerCase()
  const disableCacheBust = Boolean(config?.disableCacheBust)
  if (method === 'get' && !disableCacheBust) {
    config.params = {
      ...(config.params || {}),
      _t: Date.now()
    }
  }

  return config
})

const shouldRetry = (error) => {
  const status = Number(error?.response?.status || 0)
  const method = String(error?.config?.method || 'get').toLowerCase()
  if (method !== 'get') return false
  if (error?.code === 'ERR_CANCELED') return false
  return !status || status >= 500
}

service.interceptors.response.use(
  (response) => {
    const payload = response?.data
    if (payload && typeof payload === 'object' && payload.success === false) {
      const err = new Error(payload.message || '请求失败')
      err.code = payload.code
      err.response = response
      throw err
    }
    if (payload && typeof payload === 'object' && payload.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
      return {
        ...response,
        data: payload.data
      }
    }
    return response
  },
  async (error) => {
    const config = error?.config || {}
    config.__retryCount = Number(config.__retryCount || 0)

    if (shouldRetry(error) && config.__retryCount < 1) {
      config.__retryCount += 1
      return service(config)
    }

    return Promise.reject(error)
  }
)

export default service
