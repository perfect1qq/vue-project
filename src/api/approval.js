/**
 * @module api/approval
 * @description 审批流程相关 API 接口封装
 *
 * 功能说明：
 * - 封装报价单审批流程的所有 HTTP 请求
 * - 支持提交审批、通过、驳回操作
 * - 提供审批列表和历史记录查询
 * - 所有接口通过 `unwrap()` 包装，自动提取 response.data
 *
 * 审批状态流转：
 * ┌──────────┐   提交    ┌──────────┐   通过    ┌──────────┐
 * │  草稿/编辑 │ ──────▶ │  待审批   │ ──────▶ │  已通过   │
 * └──────────┘         └──────────┘         └──────────┘
 *                            │                    ▲
 *                            │ 驳回               │
 *                            ▼                    │
 *                      ┌──────────┐ 重新提交       │
 * │  已驳回   │ ───────────────┘
 *                      └──────────┘
 *
 * 接口列表：
 * ┌────────────────────┬──────────────────────────────────────────┐
 * │  方法               │  路径 & 说明                               │
 * ├────────────────────┼──────────────────────────────────────────┤
 * │  submitApproval(id) │  POST /api/quotations/:id/submit - 提交审批│
 * │  approve(id)        │  POST /api/quotations/:id/approve - 通过  │
 * │  reject(id, cmt)    │  POST /api/quotations/:id/reject - 驳回   │
 * │  list(params)       │  GET  /api/approvals - 待审批列表          │
 * │  get(id)            │  GET  /api/approvals/:id - 审批详情       │
 * │  listHistory(params)│  GET  /api/approvals/history - 历史记录   │
 * └────────────────────┴──────────────────────────────────────────┘
 *
 * @example
 * import { approvalApi } from '@/api/approval'
 *
 * // 提交报价单审批
 * await approvalApi.submitApproval(123)
 *
 * // 通过审批
 * await approvalApi.approve(123)
 *
 * // 驳回审批（带驳回原因）
 * await approvalApi.reject(123, '价格需要调整')
 *
 * // 获取待审批列表
 * const { approvals, total } = await approvalApi.list({ page: 1, pageSize: 10 })
 */

import request from '../utils/request'
import { unwrap } from '../utils/unwrap'

/**
 * 提交报价单到审批流程
 *
 * 将草稿状态的报价单提交给管理员审批
 * 提交后报价单状态变为"待审批"，不可再编辑
 *
 * @param {number|string} id - 报价单 ID
 * @returns {Promise<Object>} 操作结果
 */
const submitApproval = (id) => request.post(`/api/quotations/${id}/submit`)

/**
 * 通过审批
 *
 * 管理员审核后批准该报价单
 * 通过后报价单状态变为"已通过"
 *
 * @param {number|string} id - 报价单 ID（或审批记录 ID）
 * @returns {Promise<Object>} 操作结果
 */
const approve = (id) => request.post(`/api/quotations/${id}/approve`)

/**
 * 驳回审批
 *
 * 管理员审核后驳回该报价单，需提供驳回原因
 * 驳回后报价单退回给创建者修改
 *
 * @param {number|string} id - 报价单 ID（或审批记录 ID）
 * @param {string} comment - 驳回原因/备注
 * @returns {Promise<Object>} 操作结果
 */
const reject = (id, comment) => request.post(`/api/quotations/${id}/reject`, { comment })

/**
 * 获取待审批列表
 *
 * 查询当前需要管理员处理的待审批报价单
 * 支持分页和关键词搜索
 *
 * @param {Object} [params] - 查询参数
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=10] - 每页条数
 * @param {string} [params.keyword] - 搜索关键词（公司名/提交人等）
 * @returns {Promise<Object>} 列表响应 { approvals, total }
 */
const list = (params) => request.get('/api/approvals', { params })

/**
 * 获取审批详情
 *
 * 查询单条审批记录的详细信息，
 * 包含报价单内容、审批历史、操作日志等
 *
 * @param {number|string} id - 审批记录 ID
 * @returns {Promise<Object>} 审批详情对象
 */
const get = (id) => request.get(`/api/approvals/${id}`)

/**
 * 获取审批历史记录
 *
 * 查询所有已处理过的审批记录（通过+驳回）
 * 支持分页和搜索筛选
 *
 * @param {Object} [params] - 查询参数
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=10] - 每页条数
 * @param {string} [params.keyword] - 搜索关键词
 * @param {string} [params.status] - 状态筛选（approved/rejected）
 * @returns {Promise<Object>} 历史记录列表 { records, total }
 */
const listHistory = (params) => request.get('/api/approvals/history', { params })

/** 审批 API 对象（完整版） */
const approvalApi = {
  submitApproval: unwrap(submitApproval),
  approve: unwrap(approve),
  reject: unwrap(reject),
  list: unwrap(list),
  get: unwrap(get),
  listHistory: unwrap(listHistory)
}

export { approvalApi }
export default approvalApi
