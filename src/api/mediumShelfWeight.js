// 中型货架重量表
import request from '../utils/request.js'

export const mediumShelfWeightApi = {
  getConfig() {
    return request.get('/api/medium-shelf-weight').then(res => res.data)
  },

  saveConfig(payload) {
    return request.put('/api/medium-shelf-weight', payload).then(res => res.data)
  }
}