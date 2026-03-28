import axios from 'axios'
import http from '../api/http'
const service = axios.create({
  baseURL: http.defaults.baseURL,
  timeout: 5000
})

service.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default service
