/**
 * @module api/customer
 * @description 客户管理 API 调用
 */

import request from '@/utils/request'
import { unwrap } from '@/utils/unwrap'

const list = (params) => request.get('/api/customers', { params })
const getDetail = (id) => request.get(`/api/customers/${id}`)
const create = (data) => request.post('/api/customers', data)
const update = (id, data) => request.put(`/api/customers/${id}`, data)
const remove = (id) => request.delete(`/api/customers/${id}`)
const addFollowUp = (customerId, data) => request.post(`/api/customers/${customerId}/follow-ups`, data)
const deleteFollowUp = (id) => request.delete(`/api/customers/follow-ups/${id}`)

export const customerApi = {
  list: unwrap(list),
  getDetail: unwrap(getDetail),
  create: unwrap(create),
  update: unwrap(update),
  remove: unwrap(remove),
  addFollowUp: unwrap(addFollowUp),
  deleteFollowUp: unwrap(deleteFollowUp)
}

export default customerApi