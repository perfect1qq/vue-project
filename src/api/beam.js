import request from '@/utils/request'

export const beamApi = {
  list(params = {}) {
    return request.get('/api/beam-quotations', { params }).then(res => res.data)
  },

  create(payload) {
    return request.post('/api/beam-quotations', payload).then(res => res.data)
  },

  update(id, payload) {
    return request.put(`/api/beam-quotations/${id}`, payload).then(res => res.data)
  },

  remove(id) {
    return request.delete(`/api/beam-quotations/${id}`).then(res => res.data)
  },
  
  checkName(name) {
    return request.get('/api/beam-quotations/check-name', { params: { name } }).then(res => res.data)
  }
}
