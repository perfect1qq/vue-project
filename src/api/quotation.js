import request from '@/utils/request'

/**
 * 报价单综合业务总栈 API
 * 覆盖：报价增删改查、OA流程生命周期（送审、驳回）、系统通知铃铛
 */
export const quotationApi = {
  /** 获取筛选后的报价单报表 */
  async list(params = {}, config = {}) {
    const res = await request.get('/api/quotations', { params, ...config })
    return res.data
  },

  /** 提取单个报价单的详情记录 */
  async get(id) {
    const res = await request.get(`/api/quotations/${id}`)
    return res.data
  },

  /** 持久化新建一个草稿/现成报价单 */
  async create(payload) {
    const res = await request.post('/api/quotations', payload)
    return res.data
  },

  /** 提交并覆盖修改报价单内容 */
  async update(id, payload) {
    const res = await request.put(`/api/quotations/${id}`, payload)
    return res.data
  },

  /** 业务侧：向上级发起送审流程 */
  async submit(id) {
    const res = await request.post(`/api/quotations/${id}/submit`)
    return res.data
  },

  /** 业务侧：撤回处于待审批状态的单据 */
  async recall(id) {
    const res = await request.post(`/api/quotations/${id}/recall`)
    return res.data
  },

  /** 管理侧：同意该报价单流程 */
  async approve(id, comment = '同意') {
    const res = await request.post(`/api/quotations/${id}/approve`, { comment })
    return res.data
  },

  /** 管理侧：拒绝并打回该报价单 */
  async reject(id, comment = '驳回') {
    const res = await request.post(`/api/quotations/${id}/reject`, { comment })
    return res.data
  },

  /** 废弃指定的报价单 */
  async remove(id) {
    const res = await request.delete(`/api/quotations/${id}`)
    return res.data
  },

  /** 智能 NLP：将剪贴板的散乱文本转译为货架数据包 */
  async parseText(text) {
    const res = await request.post('/api/quotation-parse', { text })
    return res.data
  },

  /** 获取右上角小铃铛的未读计数器 */
  async getUnreadNotificationsCount() {
    const res = await request.get('/api/notifications/unread-count')
    return res.data
  },

  /** 下拉抽屉：获取最近通知历史 */
  async getNotifications() {
    const res = await request.get('/api/notifications')
    return res.data
  },

  /** 标记具体某条小铃铛消息为已读 */
  async markNotificationAsRead(id) {
    const res = await request.put(`/api/notifications/${id}/read`)
    return res.data
  },

  /** 全部通知一键已读 */
  async markAllNotificationsAsRead() {
    const res = await request.post('/api/notifications/read-all')
    return res.data
  }
}

/**
 * 货架重量统计模块独立接口
 */
export const quotationStatisticsApi = {
  /** 把重型货架文本化为重量与件数列表 */
  async parse(rawText) {
    const res = await request.post('/api/calculate', { text: rawText, type: 'net_panel' })
    return res.data
  }
}
