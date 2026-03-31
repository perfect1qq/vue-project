import request from '@/utils/request'

/**
 * 用户管理接口服务
 * 封装了所有与用户相关的后端交互逻辑
 */
export const userApi = {
  /**
   * 获取所有用户列表
   * @returns {Promise<Array>} 返回包含所有用户的数组
   */
  async list() {
    const res = await request.get('/api/users')
    return res.data
  },
  
  /**
   * 重置指定用户的密码
   * @param {number} id - 需要重置密码的目标用户 ID
   * @param {string} password - 全新的登录密码
   * @returns {Promise<Object>} 操作结果确认对象
   */
  async resetPassword(id, password) {
    const res = await request.post(`/api/users/${id}/reset-password`, { password })
    return res.data
  },
  
  /**
   * 更新指定用户的系统角色权限
   * @param {number} id - 目标用户 ID
   * @param {string} role - 角色标识字典 (例如 'admin' | 'user')
   * @returns {Promise<Object>} 操作结果确认对象
   */
  async updateRole(id, role) {
    const res = await request.put(`/api/users/${id}/role`, { role })
    return res.data
  }
}
