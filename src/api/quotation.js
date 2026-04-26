/**
 * @file api/quotation.js
 * @description 报价单相关 API 接口封装
 *
 * 功能说明：
 * - 提供报价单的完整 CRUD 操作和业务接口
 * - 所有接口通过 `unwrap()` 包装，自动提取 response.data
 * - 支持列表查询、创建、更新、删除、详情查看
 * - 支持审批流程（提交/通过/驳回）
 * - 支持 AI 智能解析文本功能
 * - 支持统计数据获取与计算
 *
 * 接口列表：
 * ┌────────────────────┬──────────────────────────────────────────┐
 * │  方法               │  路径 & 说明                               │
 * ├────────────────────┼──────────────────────────────────────────┤
 * │  list()            │  GET /api/quotations - 获取报价单列表      │
 * │  create(data)      │  POST /api/quotations - 创建新报价单       │
 * │  update(id, data)  │  PUT /api/quotations/:id - 更新报价单     │
 * │  remove(id)        │  DELETE /api/quotations/:id - 删除报价单   │
 * │  get(id)           │  GET /api/quotations/:id - 获取详情       │
 * │  getStatistics()   │  GET /api/quotations/stats - 统计数据      │
 * │  parseText(text)   │  POST /api/tools/quotation-parse - AI解析  │
 * │  approve(id, cmt)  │  POST /api/quotations/:id/approve - 通过   │
 * │  reject(id, cmt)   │  POST /api/quotations/:id/reject - 驳回    │
 * │  parseStatistics() │  POST /api/tools/calculate - 解析统计文本  │
 * └────────────────────┴──────────────────────────────────────────┘
 *
 * 使用示例：
 * import { quotationApi } from '@/api/quotation'
 *
 * // 获取列表（支持分页参数）
 * const { quotations, total } = await quotationApi.list({ page: 1, pageSize: 10 })
 *
 * // 创建报价单
 * const newQuotation = await quotationApi.create({ companyName: '测试公司', items: [...] })
 *
 * // AI 智能解析
 * const parsed = await quotationApi.parseText('粘贴的表格内容')
 */

import request from '../utils/request'
import { unwrap } from '../utils/unwrap'

/**
 * 获取报价单列表
 *
 * @param {Object} [params] - 查询参数
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=10] - 每页条数
 * @param {string} [params.keyword] - 搜索关键词
 * @returns {Promise<Object>} 列表响应 { quotations, total }
 */
const list = (params) => request.get('/api/quotations', { params })

/**
 * 创建新报价单
 *
 * @param {Object} data - 报价单数据
 * @param {string} data.companyName - 公司名称
 * @param {Array} data.items - 明细行数组
 * @param {number} [data.discount] - 折扣百分比
 * @param {number} [data.finalPrice] - 成交价
 * @returns {Promise<Object>} 创建后的记录
 */
const create = (data) => request.post('/api/quotations', data)

/**
 * 更新报价单
 *
 * @param {number|string} id - 报价单 ID
 * @param {Object} data - 更新数据（同 create）
 * @returns {Promise<Object>} 更新后的记录
 */
const update = (id, data) =>
  request.put(`/api/quotations/${id}`, data)

/**
 * 删除报价单
 *
 * @param {number|string} id - 报价单 ID
 * @returns {Promise<void>}
 */
const remove = (id) => request.delete(`/api/quotations/${id}`)

/**
 * 获取报价单详情
 *
 * @param {number|string} id - 报价单 ID
 * @returns {Promise<Object>} 记录详情
 */
const get = (id) => request.get(`/api/quotations/${id}`)

/**
 * 获取统计数据
 *
 * 返回报价单相关的统计信息，如总数、金额汇总等
 *
 * @returns {Promise<Object>} 统计数据对象
 */
const getStatistics = () =>
  request.get('/api/quotations/stats')

/**
 * AI 智能解析粘贴文本为结构化数据
 *
 * 将用户从 Excel/网页复制的表格文本，
 * 自动识别并转换为结构化的明细行数据
 *
 * @param {string} text - 用户粘贴的原始文本
 * @returns {Promise<Object>} 解析结果 { items, columns, warnings }
 */
const parseText = (text) =>
  request.post('/api/tools/quotation-parse', { text })

/**
 * 审批通过
 *
 * @param {number|string} id - 报价单 ID
 * @param {string} [comment=''] - 审批意见
 * @returns {Promise<Object>} 操作结果
 */
const approve = (id, comment) =>
  request.post(`/api/quotations/${id}/approve`, { comment })

/**
 * 审批驳回
 *
 * @param {number|string} id - 报价单 ID
 * @param {string} [comment=''] - 驳回原因
 * @returns {Promise<Object>} 操作结果
 */
const reject = (id, comment) =>
  request.post(`/api/quotations/${id}/reject`, { comment })

/**
 * 解析统计文本
 *
 * 用于统计页面，将原始文本解析为结构化统计结果
 *
 * @param {string} rawText - 原始统计文本
 * @returns {Promise<Object>} 解析后的统计数据
 */
const parseStatistics = (rawText) =>
  request.post('/api/tools/calculate', {
    text: rawText,
    type: 'statistics',
  })

// ==================== 导出 ====================

/** 报价单 API 对象（完整版） */
const quotationApi = {
  list: unwrap(list),
  create: unwrap(create),
  update: unwrap(update),
  remove: unwrap(remove),
  get: unwrap(get),
  getStatistics: unwrap(getStatistics),
  parseText: unwrap(parseText),
  approve: unwrap(approve),
  reject: unwrap(reject),
  parse: unwrap(parseStatistics),
}

/** 统计专用 API（简化版） */
const quotationStatisticsApi = {
  getStatistics: unwrap(getStatistics),
  parse: unwrap(parseStatistics),
}

export { quotationApi, quotationStatisticsApi }
export default quotationApi
