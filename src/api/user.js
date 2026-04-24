import request from '../utils/request'
import { unwrap } from '../utils/unwrap'

const changePassword = (data) => request.post('/api/user/change-password', data)
const resetPassword = (userId, newPassword) =>
  request.post(`/api/users/${userId}/reset-password`, { password: newPassword })
const listUsers = () => request.get('/api/users')
const createUser = (data) => request.post('/api/users', data)
const updateUserRole = (userId, role) => request.put(`/api/users/${userId}/role`, { role })
const updateUserName = (userId, name) => request.put(`/api/users/${userId}/name`, { name })
const deleteUser = (userId) => request.delete(`/api/users/${userId}`)

const userApi = {
  changePassword: unwrap(changePassword),
  resetPassword: unwrap(resetPassword),
  list: unwrap(listUsers),
  create: unwrap(createUser),
  remove: unwrap(deleteUser),
  updateRole: unwrap(updateUserRole),
  updateName: unwrap(updateUserName)
}

export { userApi }
export default userApi
