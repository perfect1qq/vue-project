/**
 * @file api/auth.js
 * @description 认证相关 API 接口封装
 *
 * 功能说明：
 * - 封装所有与用户认证相关的 HTTP 请求
 * - 统一配置请求选项（如禁用自动跳转、跳过去重等）
 * - 提供登录、注册、获取用户资料、登出四个核心接口
 *
 * 接口列表：
 * ┌─────────────┬──────────┬────────────────────────────────┐
 * │  方法        │  路径     │  说明                          │
 * ├─────────────┼──────────┼────────────────────────────────┤
 * │  POST       │ /login    │ 用户登录（用户名 + 密码）       │
 * │  POST       │ /register│ 用户注册                        │
 * │  GET        │ /profile │ 获取当前登录用户信息             │
 * │  POST       │ /logout  │ 用户登出                        │
 * └─────────────┴──────────┴────────────────────────────────┘
 *
 * 特殊配置说明：
 * - authRedirect: false → 401 错误时不自动跳转登录页（由调用方处理）
 * - skipCancel: true → 不参与请求去重（认证请求需要独立处理）
 * - silent: true → 静默模式，不显示错误提示弹窗
 * - disableCacheBust: true → GET 请求不添加时间戳参数
 *
 * 使用示例：
 * import authApi from '@/api/auth'
 *
 * // 登录
 * const user = await authApi.login({ username: 'admin', password: '123456' })
 *
 * // 获取当前用户资料
 * const profile = await authApi.getProfile()
 */

import request from '../utils/request'

/**
 * 用户登录
 *
 * 发送用户名和密码到后端进行验证，
 * 成功后后端会设置认证 Cookie（httpOnly）
 *
 * @param {Object} data - 登录凭据
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @param {Object} [config={}] - 额外的 Axios 配置
 * @returns {Promise<Object>} 响应数据（包含 user、permissions 等）
 */
const login = (data, config = {}) =>
  request.post('/api/login', data, {
    authRedirect: false,
    skipCancel: true,
    ...config,
  })

/**
 * 用户注册
 *
 * 创建新用户账号
 *
 * @param {Object} data - 注册信息
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @param {string} [data.name] - 显示名称
 * @param {Object} [config={}] - 额外的 Axios 配置
 * @returns {Promise<Object>} 注册结果
 */
const register = (data, config = {}) =>
  request.post('/api/register', data, {
    authRedirect: false,
    skipCancel: true,
    ...config,
  })

/**
 * 获取当前登录用户资料
 *
 * 用于页面刷新后恢复会话状态
 * 通过 Cookie 中的 Token 自动鉴权，无需传参
 *
 * 特殊配置：
 * - disableCacheBust: 不添加时间戳（允许浏览器缓存）
 * - silent: 静默模式（401 时不弹出错误提示）
 *
 * @param {Object} [config={}] - 额外的 Axios 配置
 * @returns {Promise<Object>} 用户资料对象
 */
const getProfile = (config = {}) =>
  request.get('/api/profile', {
    disableCacheBust: true,
    skipCancel: true,
    silent: true,
    authRedirect: false,
    ...config,
  })

/**
 * 用户登出
 *
 * 通知后端清除服务端 Session，
 * 前端同时清除本地存储的用户状态
 *
 * @param {Object} [config={}] - 额外的 Axios 配置
 * @returns {Promise<void>}
 */
const logout = (config = {}) =>
  request.post('/api/logout', null, {
    authRedirect: false,
    skipCancel: true,
    silent: true,
    ...config,
  })

export default {
  login,
  register,
  getProfile,
  logout,
}
