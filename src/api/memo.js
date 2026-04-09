import request from '@/utils/request'

export const memoApi = {
  async list(params = {}, config = {}) {
    const res = await request.get('/api/memos', { params, ...config })
    return res.data
  },
  async get(id) {
    const res = await request.get(`/api/memos/${id}`)
    return res.data
  },
  async create(payload) {
    const res = await request.post('/api/memos', payload)
    return res.data
  },
  async update(id, payload) {
    const res = await request.put(`/api/memos/${id}`, payload)
    return res.data
  },
  async remove(id) {
    const res = await request.delete(`/api/memos/${id}`)
    return res.data
  },
  async history(id) {
    const res = await request.get(`/api/memos/${id}/history`)
    return res.data
  }
}
