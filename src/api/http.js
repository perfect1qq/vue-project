import axios from 'axios'

const normalizeBaseURL = () => {
  const envBase = String(import.meta.env.VITE_API_BASE_URL || '').trim()
  if (envBase) return envBase
  // 本地开发默认直连后端，避免因未配置环境变量导致全部接口报错。
  return 'http://localhost:3000'
}

const http = axios.create({
  baseURL: normalizeBaseURL(),
  timeout: 300000
})

export default http