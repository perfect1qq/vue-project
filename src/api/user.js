/**
 * @module api/user
 * @description 用户管理 API 接口封装
 *
 * 功能说明：
 * - 封装用户账号管理的所有 HTTP 请求
 * - 支持用户 CRUD 操作（创建、查询、修改、删除）
 * - 支持密码修改和重置（管理员功能）
 * - 支持角色分配（admin/user）
 * - 提供邀请码生成和刷新
 *
 * 权限说明：
 * ┌────────────────┬──────────────────────────────────────────┐
 * │  操作           │  权限要求                                 │
 * ├────────────────┼──────────────────────────────────────────┤
 * │  listUsers      │  仅 admin                                │
 * │  createUser     │  仅 admin                                │
 * │  deleteUser     │  仅 admin                                │
 * │  updateRole     │  仅 admin（不能修改自己的角色）            │
 * │  updateName     │  可修改自己的或他人的名称                  │
 * │  changePassword │  当前登录用户（需验证旧密码）              │
 * │  resetPassword  │  仅 admin（强制重置他人密码）             │
 * │  getInviteCode  │  所有已登录用户                          │
 * │  refreshInviteCode│ 仅 admin                               │
 * └────────────────┴──────────────────────────────────────────┘
 *
 * 角色体系：
 * - admin: 管理员，拥有所有权限，可管理其他用户
 * - user: 普通用户/业务员，可使用业务功能
 * - guest: 游客，只读访问（通过邀请链接注册）
 *
 * @example
 * import { userApi } from '@/api/user'
 *
 * // 获取所有用户列表
 * const users = await userApi.list()
 *
 * // 创建新用户
 * const user = await userApi.create({
 *   username: 'zhangsan',
 *   password: '123456',
 *   name: '张三'
 * })
 *
 * // 修改密码
 * await userApi.changePassword({
 *   oldPassword: '123456',
 *   newPassword: 'newPassword123'
 * })
 */

import request from '../utils/request'
import { unwrap } from '../utils/unwrap'

/**
 * 修改当前用户密码
 *
 * 需要提供旧密码进行身份验证，
 * 验证成功后才能设置新密码
 *
 * @param {Object} data - 密码数据
 * @param {string} data.oldPassword - 当前密码（必填）
 * @param {string} data.newPassword - 新密码（至少 6 位）
 * @returns {Promise<Object>} 操作结果
 */
const changePassword = (data) => request.post('/api/user/change-password', data)

/**
 * 管理员重置指定用户的密码
 *
 * 强制将用户密码重置为新值，
 * 无需知道原密码（管理员特权）
 *
 * @param {number|string} userId - 目标用户 ID
 * @param {string} newPassword - 新设置的密码
 * @returns {Promise<Object>} 操作结果
 */
const resetPassword = (userId, newPassword) =>
  request.post(`/api/users/${userId}/reset-password`, { password: newPassword })

/**
 * 获取所有用户列表
 *
 * 仅管理员可调用，
 * 返回系统中所有注册用户的基本信息
 *
 * @returns {Promise<Array>} 用户列表数组
 */
const listUsers = () => request.get('/api/users')

/**
 * 创建新用户
 *
 * 仅管理员可调用，
 * 用于手动添加系统用户
 *
 * @param {Object} data - 用户数据
 * @param {string} data.username - 用户名（必填，唯一）
 * @param {string} data.password - 初始密码（必填，至少 6 位）
 * @param {string} [data.name] - 显示名称
 * @param {string} [data.role] - 角色（默认 user）
 * @returns {Promise<Object>} 新创建的用户对象
 */
const createUser = (data) => request.post('/api/users', data)

/**
 * 修改用户角色
 *
 * 将指定用户的角色切换为 admin 或 user
 * 注意：不能修改自己的角色
 *
 * @param {number|string} userId - 目标用户 ID
 * @param {string} role - 新角色（'admin' | 'user'）
 * @returns {Promise<Object>} 更新后的用户信息
 */
const updateUserRole = (userId, role) =>
  request.put(`/api/users/${userId}/role`, { role })

/**
 * 修改用户显示名称
 *
 * @param {number|string} userId - 目标用户 ID
 * @param {string} name - 新的显示名称
 * @returns {Promise<Object>} 更新后的用户信息
 */
const updateUserName = (userId, name) =>
  request.put(`/api/users/${userId}/name`, { name })

/**
 * 删除用户
 *
 * 仅管理员可调用，
 * 删除后该用户无法再登录系统
 * 注意：如果用户有关联数据（报价单等），需谨慎操作
 *
 * @param {number|string} userId - 要删除的用户 ID
 * @returns {Promise<Object>} 操作结果
 */
const deleteUser = (userId) => request.delete(`/api/users/${userId}`)

/**
 * 获取当前用户的邀请码
 *
 * 每个用户都有一个唯一的邀请码，
 * 用于分享给新用户注册时使用
 *
 * @returns {Promise<Object>} 包含 inviteCode 字段的对象
 */
const getInviteCode = () => request.get('/api/invite-code')

/**
 * 刷新当前用户的邀请码
 *
 * 生成一个新的邀请码（旧的立即失效）
 * 仅管理员可调用此接口
 *
 * @returns {Promise<Object>} 包含新 inviteCode 的对象
 */
const refreshInviteCode = () => request.post('/api/invite-code/refresh')

/** 用户 API 对象（对外导出） */
const userApi = {
  changePassword: unwrap(changePassword),
  resetPassword: unwrap(resetPassword),
  list: unwrap(listUsers),
  create: unwrap(createUser),
  remove: unwrap(deleteUser),
  updateRole: unwrap(updateUserRole),
  updateName: unwrap(updateUserName),
  getInviteCode: unwrap(getInviteCode),
  refreshInviteCode: unwrap(refreshInviteCode)
}

export { userApi }
export default userApi
