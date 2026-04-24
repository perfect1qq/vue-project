/**
 * @module api/http
 * @description Axios 基础实例配置
 * 
 * 提供全局统一的 axios 实例，
 * 用于创建其他 API 模块的请求实例。
 * 
 * ⚠️ 重要提示：
 * - 此文件仅提供基础 axios 配置
 * - 实际开发请使用 `@/utils/request` （具备完整的拦截器功能）
 * - request.js 在此基础上增加了：Cookie 会话支持、错误处理、401 跳转、请求去重等
 * 
 * 功能特性（通过 request.js 继承）：
 * ✅ 自动携带受保护 Cookie
 * ✅ GET 请求缓存防穿透
 * ✅ 响应数据标准化
 * ✅ 错误统一处理与自动重试
 * ✅ 401 自动跳转登录
 * ✅ AbortController 请求取消机制
 */

import axios from 'axios'

/** API 基础 URL 配置 */
const normalizeBaseURL = () => {
  const envBase = String(import.meta.env.VITE_API_BASE_URL || '').trim()
  return envBase || 'http://localhost:3000'
}

const http = axios.create({
  baseURL: normalizeBaseURL(),
  timeout: 300000,
  withCredentials: true
})

export default http
