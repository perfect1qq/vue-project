import request from '@/utils/request'

/**
 * 官网留言管理 API
 *
 * 说明：
 * - list 支持分页与搜索；
 * - assign 仅管理员可用；
 * - remark 用于给每条线索添加跟进备注。
 */
export const messageApi = {
  /**
   * 获取留言列表。
   * @param {object} params - { page, pageSize, keyword }
   */
  async list(params = {}, config = {}) {
    const res = await request.get('/api/messages/list', { params, ...config })
    return res.data
  },

  /**
   * 指派留言给指定用户。
   * @param {number} id - 留言 ID
   * @param {number} userId - 业务员 ID
   */
  async assign(id, userId) {
    const res = await request.put(`/api/messages/assign/${id}`, { assignedTo: userId })
    return res.data
  },

  /**
   * 保存备注。
   * @param {number} id - 留言 ID
   * @param {string} remark - 备注内容
   */
  async updateRemark(id, remark) {
    const res = await request.put(`/api/messages/${id}/remark`, { remark })
    return res.data
  },

  /**
   * 删除留言。
   * @param {number} id - 留言 ID
   */
  async remove(id) {
    const res = await request.delete(`/api/messages/${id}`)
    return res.data
  }
}
