/**
 * @module api/customer
 * @description 客户管理 API 接口封装
 *
 * 功能说明：
 * - 封装客户信息的完整 CRUD 操作
 * - 支持客户跟进记录管理（添加/删除）
 * - 所有接口通过 `unwrap()` 包装，自动提取 response.data
 *
 * 数据模型：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Customer (客户)                                            │
 * ├─────────────────────────────────────────────────────────────┤
 * │  id: number              - 客户唯一标识                      │
 * │  companyName: string     - 公司名称（必填）                   │
 * │  customerName: string    - 客户姓名                          │
 * │  contactInfo: string     - 联系方式（电话/微信等）            │
 * │  cooperationStatus: string - 合作状态（已合作/未合作）        │
 * │  customerType: string    - 客户类型（终端/经销商/待确认）      │
 * │  remark: string          - 备注信息                          │
 * │  createdAt: Date         - 创建时间                          │
 * │  updatedAt: Date         - 更新时间                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  FollowUp (跟进记录)                                         │
 * │  ├── id: number           - 记录 ID                          │
 * │  ├── customerId: number   - 关联的客户 ID                    │
 * │  ├── content: string      - 跟进内容                         │
 * │  ├── followUpDate: Date   - 跟进日期                         │
 * │  └── createdAt: Date      - 创建时间                         │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 与报价单联动：
 * - 客户列表会显示关联的报价单状态（已报价/未报价）
 * - 可从客户页面直接跳转到对应的报价单查看
 *
 * @example
 * import { customerApi } from '@/api/customer'
 *
 * // 获取客户列表
 * const { customers, total } = await customerApi.list({ page: 1, pageSize: 10 })
 *
 * // 创建新客户
 * const customer = await customerApi.create({
 *   companyName: '武汉测试公司',
 *   customerName: '张三',
 *   contactInfo: '13800138000'
 * })
 *
 * // 添加跟进记录
 * await customerApi.addFollowUp(customerId, {
 *   content: '电话沟通，对方有意向',
 *   followUpDate: '2024-01-15'
 * })
 */

import request from '@/utils/request'
import { unwrap } from '@/utils/unwrap'

/**
 * 获取客户列表
 *
 * 支持分页和关键词搜索，
 * 返回结果中包含每个客户的报价状态信息
 *
 * @param {Object} [params] - 查询参数
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=10] - 每页条数
 * @param {string} [params.keyword] - 搜索关键词（公司名/姓名/联系方式）
 * @param {string} [params.cooperationStatus] - 合作状态筛选
 * @param {string} [params.customerType] - 客户类型筛选
 * @returns {Promise<Object>} 列表响应 { customers, total }
 */
const list = (params) => request.get('/api/customers', { params })

/**
 * 获取客户详情
 *
 * 查询单个客户的完整信息，
 * 包含所有跟进记录和关联的报价单信息
 *
 * @param {number|string} id - 客户 ID
 * @returns {Promise<Object>} 客户详情对象
 */
const getDetail = (id) => request.get(`/api/customers/${id}`)

/**
 * 创建新客户
 *
 * @param {Object} data - 客户数据
 * @param {string} data.companyName - 公司名称（必填）
 * @param {string} [data.customerName] - 客户姓名
 * @param {string} [data.contactInfo] - 联系方式
 * @param {string} [data.cooperationStatus] - 合作状态
 * @param {string} [data.customerType] - 客户类型
 * @param {string} [data.remark] - 备注
 * @returns {Promise<Object>} 创建后的客户对象
 */
const create = (data) => request.post('/api/customers', data)

/**
 * 更新客户信息
 *
 * @param {number|string} id - 客户 ID
 * @param {Object} data - 要更新的字段
 * @returns {Promise<Object>} 更新后的客户对象
 */
const update = (id, data) => request.put(`/api/customers/${id}`, data)

/**
 * 删除客户
 *
 * 同时删除该客户的所有跟进记录
 * 如果有关联的报价单则不允许删除（需先解除关联）
 *
 * @param {number|string} id - 客户 ID
 * @returns {Promise<Object>} 操作结果
 */
const remove = (id) => request.delete(`/api/customers/${id}`)

/**
 * 添加跟进记录
 *
 * 为指定客户添加一条新的跟进记录，
 * 用于记录与客户的沟通历史
 *
 * @param {number|string} customerId - 客户 ID
 * @param {Object} data - 跟进数据
 * @param {string} data.content - 跟进内容（必填）
 * @param {string} data.followUpDate - 跟进日期（格式：YYYY-MM-DD）
 * @returns {Promise<Object>} 新创建的跟进记录
 */
const addFollowUp = (customerId, data) =>
  request.post(`/api/customers/${customerId}/follow-ups`, data)

/**
 * 删除跟进记录
 *
 * @param {number|string} id - 跟进记录 ID
 * @returns {Promise<Object>} 操作结果
 */
const deleteFollowUp = (id) =>
  request.delete(`/api/customers/follow-ups/${id}`)

/** 客户 API 对象（对外导出） */
const customerApi = {
  list: unwrap(list),
  getDetail: unwrap(getDetail),
  create: unwrap(create),
  update: unwrap(update),
  remove: unwrap(remove),
  addFollowUp: unwrap(addFollowUp),
  deleteFollowUp: unwrap(deleteFollowUp)
}

export default customerApi
