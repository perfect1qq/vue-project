// 中型货架重量表
import request from '../utils/request.js'

/**
 * 中型货架重量表关联 API
 * 掌管读取和覆盖保存“中型货架”全局配置的通道
 */
export const mediumShelfWeightApi = {
  /**
   * 提取当前存在数据库中的中型货架量表设定
   * @returns {Promise<Object>} 包含明细项的业务数据体
   */
  async getConfig() {
    const res = await request.get('/api/medium-shelf-weight')
    return res.data
  },

  /**
   * 将修改过后的新版本货架量表整体下发并覆盖
   * @param {Object} payload - 新的数组与表头结构体
   * @returns {Promise<Object>} 后端响应成功状态
   */
  async saveConfig(payload) {
    const res = await request.put('/api/medium-shelf-weight', payload)
    return res.data
  }
}