/**
 * @module utils/authSession
 * @description 认证会话管理
 *
 * 处理 Token 存储和认证过期逻辑：
 * - Token 的存取与清除
 * - 401 错误时的自动跳转登录
 * - 用户主动登出
 *
 * v3 更新：
 * - 移除 SESSION_REVOKED 特殊处理（后端不再返回此错误码）
 * - 统一所有 401 错误为"登录状态过期"
 */

import { ElMessage } from 'element-plus'
import router from '../router'
import { logout } from '@/api/user'
import { to } from '@/utils/async'

/**
 * 获取当前 Token
 * @returns {string|null}
 */
export const getToken = () => localStorage.getItem('token')

/**
 * 设置 Token
 * @param {string} token - JWT Token
 */
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token)
  }
}

/**
 * 清除认证信息并跳转登录页
 *
 * 统一处理所有 401 错误，不再区分原因
 */
export const clearAuthAndRedirect = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')

  ElMessage.warning('登录状态已过期，请重新登录')

  router.push('/login').then(() => {}).catch(() => {})
}

/**
 * 处理认证过期
 * @param {string} [code] - 服务端返回的过期原因码（已废弃参数）
 */
export const handleAuthExpired = (code) => clearAuthAndRedirect()

/**
 * 用户主动登出（调用后端接口 + 清除本地状态）
 */
export const logoutByUser = async () => {
  await to(logout())
  clearAuthAndRedirect()
}

export default { getToken, setToken, handleAuthExpired, logoutByUser }
