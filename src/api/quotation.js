import request from '@/utils/request'

export const quotationApi = {
  list(params = {}) {
    return request.get('/api/quotations', { params }).then(res => res.data)
  },

  get(id) {
    return request.get(`/api/quotations/${id}`).then(res => res.data)
  },

  create(payload) {
    return request.post('/api/quotations', payload).then(res => res.data)
  },

  update(id, payload) {
    return request.put(`/api/quotations/${id}`, payload).then(res => res.data)
  },

  submit(id) {
    return request.post(`/api/quotations/${id}/submit`).then(res => res.data)
  },

  recall(id) {
    return request.post(`/api/quotations/${id}/recall`).then(res => res.data)
  },

  approve(id, comment = '同意') {
    return request.post(`/api/quotations/${id}/approve`, { comment }).then(res => res.data)
  },

  reject(id, comment = '驳回') {
    return request.post(`/api/quotations/${id}/reject`, { comment }).then(res => res.data)
  },

  remove(id) {
    return request.delete(`/api/quotations/${id}`).then(res => res.data)
  },

  parseText(text) {
    return request.post('/api/quotation-parse', { text }).then(res => res.data)
  }
}

export const quotationStatisticsApi = {
  parse(rawText) {
    return request.post('/api/calculate', { text: rawText, type: 'net_panel' }).then(res => res.data)
  }
}
