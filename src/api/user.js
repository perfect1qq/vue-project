import request from '@/utils/request'

export const userApi = {
  list() {
    return request.get('/api/users').then(res => res.data)
  },
  
  resetPassword(id, password) {
    return request.post(`/api/users/${id}/reset-password`, { password }).then(res => res.data)
  },
  
  updateRole(id, role) {
    return request.put(`/api/users/${id}/role`, { role }).then(res => res.data)
  }
}
