import request from '@/utils/request'

/**
 * 横梁报价记录关联 API
 * 封装与后端 /api/beam-quotations 相关的全量异步网络请求
 */
export const beamApi = {
  /**
   * 拉取该账号下的横梁历史记录汇总列表
   * @param {Object} params - 可能是 keyword 检索
   * @returns {Promise<Object>} 横梁报价表列表数据
   */
  async list(params = {}) {
    const res = await request.get('/api/beam-quotations', { params })
    return res.data
  },

  /**
   * 新增一条横梁报价记录（并持久化）
   * @param {Object} payload - 单个横梁表格的完整结构
   * @returns {Promise<Object>} 保存成功的记录反馈
   */
  async create(payload) {
    const res = await request.post('/api/beam-quotations', payload)
    return res.data
  },

  /**
   * 重装/覆盖更新某一条特定的横梁报价单
   * @param {number} id - 被更新的历史记录 ID
   * @param {Object} payload - 更新的最新负载
   * @returns {Promise<Object>} 覆盖结果
   */
  async update(id, payload) {
    const res = await request.put(`/api/beam-quotations/${id}`, payload)
    return res.data
  },

  /**
   * 删除某个不需要的横梁旧记录
   * @param {number} id - 即将被删除的表单主键
   * @returns {Promise<Object>} 删除的响应
   */
  async remove(id) {
    const res = await request.delete(`/api/beam-quotations/${id}`)
    return res.data
  },
  
  /**
   * 向数据库确认该配置方案名称是否产生同名冲突
   * @param {string} name - 提交验证的名称
   * @returns {Promise<Object>} 返回诸如 { exists: true | false } 的冲突态
   */
  async checkName(name) {
    const res = await request.get('/api/beam-quotations/check-name', { params: { name } })
    return res.data
  }
}
