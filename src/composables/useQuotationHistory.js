/**
 * @module composables/useQuotationHistory
 * @description 报价单历史记录管理组合式函数
 * 
 * 提供报价单/横梁载重单历史记录的完整管理能力：
 * - 分页加载（支持全量拉取后前端分页）
 * - 按公司名称分组展示
 * - 关键词搜索
 * - 创建、更新、删除操作（带乐观更新）
 * - 查看和编辑模式切换
 * 
 * 数据流：
 * 1. loadHistoryList() → 调用 API 获取全部记录
 * 2. fetchAllRecords() → 处理分页，合并所有页数据
 * 3. groupByCompany() → 按公司名分组并排序
 * 4. pagedHistoryGroups → 计算属性，对分组结果进行分页
 * 
 * @example
 * const {
 *   historyList,
 *   groupedHistoryList,
 *   pagedHistoryGroups,
 *   searchKeyword,
 *   page,
 *   pageSize,
 *   total,
 *   loading,
 *   isActionLoading,
 *   loadHistoryList,
 *   onKeywordInput,
 *   handleCurrentChange,
 *   handleSizeChange,
 *   saveQuotation,
 *   deleteHistory,
 *   viewHistory,
 *   editHistory
 * } = useQuotationHistory({
 *   api: quotationApi,
 *   loadToEditor: (record, mode) => { ... }
 * })
 */

import { computed, ref, shallowRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createDebounce } from '@/utils/debounce'
import { to } from '@/utils/async'
import { formatDateOnly } from '@/utils/date'
import { useInstantListActions } from '@/composables/useInstantListActions'
import { useListQueryState } from '@/composables/useListQueryState'

/** 深拷贝工具：用于保存快照（乐观更新回滚用） */
const clone = (value) => (value === null || value === undefined ? value : JSON.parse(JSON.stringify(value)))

/**
 * 规范化单条历史记录的字段格式
 * 统一不同 API 返回的字段命名差异
 * 
 * @param {Object} [record={}] - 原始记录
 * @returns {Object} 规范化后的记录
 */
const normalizeRecord = (record = {}) => ({
  ...record,
  id: record.id,
  companyName: record.companyName || record.name || record.title || '',
  name: record.name || record.companyName || record.title || '',
  createDate: record.createDate || formatDateOnly(record.createTime || record.createdAt),
  createTime: record.createTime || record.createdAt || '',
  updateTime: record.updateTime || record.updatedAt || ''
})

/** 判断查询结果是否包含分页元数据 */
const hasPaginationMeta = (result) => Boolean(result && (
  Object.prototype.hasOwnProperty.call(result, 'total') ||
  Object.prototype.hasOwnProperty.call(result, 'page') ||
  Object.prototype.hasOwnProperty.call(result, 'pageSize')
))

/**
 * 从记录中提取公司名称用于分组
 * 
 * @param {Object} [record={}] - 原始记录
 * @returns {string} 公司名称
 */
const normalizeCompanyName = (record = {}) =>
  String(record.companyName || record.name || record.title || '未命名公司').trim() || '未命名公司'

/**
 * 提取记录的排序时间戳
 * 用于按时间倒序排列
 * 
 * @param {Object} [record={}] - 原始记录
 * @returns {number} 时间戳（毫秒），无效日期返回 0
 */
const toDateValue = (record = {}) => {
  const value = record.createTime || record.updateTime || record.createDate || ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

/**
 * 按公司名称对记录列表进行分组
 * 
 * 分组规则：
 * - 同一公司的所有记录归为一组
 * - 组内按时间倒序排列
 * - 组间按最新时间倒序，时间相同则按公司名排序
 * 
 * @param {Array} [records=[]] - 待分组的记录列表
 * @returns {Array<Object>} 分组结果数组，每项包含 companyName、count、latestDate、records 等
 */
const groupByCompany = (records = []) => {
  const map = new Map()

  records.forEach((record) => {
    const companyName = normalizeCompanyName(record)
    if (!map.has(companyName)) {
      map.set(companyName, { companyName, records: [] })
    }
    map.get(companyName).records.push(record)
  })

  return [...map.values()]
    .map((group) => {
      const recordsSorted = [...group.records].sort((a, b) => toDateValue(b) - toDateValue(a))
      return {
        companyName: group.companyName,
        count: recordsSorted.length,
        latestDate: recordsSorted[0]?.createDate || '',
        latestTime: recordsSorted[0]?.createTime || recordsSorted[0]?.updateTime || '',
        records: recordsSorted
      }
    })
    .sort((a, b) => {
      const diff = new Date(b.latestTime || 0).getTime() - new Date(a.latestTime || 0).getTime()
      if (!Number.isNaN(diff) && diff !== 0) return diff
      return a.companyName.localeCompare(b.companyName, 'zh-Hans-CN')
    })
}

/**
 * 全量拉取所有历史记录（处理服务端分页）
 * 
 * 通过循环请求获取所有页的数据并合并，
 * 支持不同 API 返回的数据结构差异。
 * 
 * 安全机制：
 * - 最大循环次数限制（200次）防止无限循环
 * - ID 去重防止重复数据
 * - 根据分页元数据判断是否还有下一页
 * 
 * @param {Object} api - API 对象，需提供 list 方法
 * @param {string} [keyword=''] - 搜索关键词
 * @returns {Promise<Array>} 合并后的全部记录列表
 */
const fetchAllRecords = async (api, keyword = '') => {
  const pageSize = 100
  const seenIds = new Set()
  const merged = []
  let currentPage = 1
  let safety = 0

  while (safety < 200) {
    const result = await api.list({ page: currentPage, pageSize, keyword: keyword.trim() })
    
    const rawList = result?.quotations || result?.records || result?.list || result?.items || result || []
    const normalizedList = Array.isArray(rawList) ? rawList.map(normalizeRecord) : []

    if (!normalizedList.length) break

    const uniqueBatch = normalizedList.filter((item) => {
      if (item.id === undefined || item.id === null) return true
      if (seenIds.has(item.id)) return false
      seenIds.add(item.id)
      return true
    })

    if (!uniqueBatch.length) break
    merged.push(...uniqueBatch)

    if (!hasPaginationMeta(result)) break

    const serverPageSize = Number(result?.pageSize ?? pageSize)
    const serverPage = Number(result?.page ?? currentPage)
    const serverTotal = Number(result?.total ?? merged.length)

    if (!Number.isFinite(serverPageSize) || normalizedList.length < serverPageSize) break
    if (Number.isFinite(serverTotal) && merged.length >= serverTotal) break

    currentPage = serverPage + 1
    safety += 1
  }

  return merged
}

/**
 * 报价单历史管理 composable
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.api - API 接口对象，需提供 list/create/update/remove 方法
 * @param {Function} options.loadToEditor - 加载记录到编辑器的回调函数
 * @returns {Object} 历史管理状态和方法集合
 */
export function useQuotationHistory({ api, loadToEditor }) {
  /** 全部历史记录（使用 shallowRef 优化大数据性能） */
  const historyList = shallowRef([])

  /** 按公司分组后的历史记录（计算属性） */
  const groupedHistoryList = computed(() => groupByCompany(historyList.value))

  /** 即时操作方法（乐观更新） */
  const { isActionLoading, withActionLock, removeById } = useInstantListActions(historyList)

  /** 查询状态（页码、条数、关键词） */
  const { page, pageSize, keyword: searchKeyword, resetToFirstPage } = useListQueryState({ page: 1, pageSize: 10, keyword: '' })

  /** 加载状态标识 */
  const loading = ref(false)

  /** 总分组数（用于分页组件） */
  const total = computed(() => groupedHistoryList.value.length)

  /** 当前页的分组数据（前端分页切片） */
  const pagedHistoryGroups = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return groupedHistoryList.value.slice(start, start + pageSize.value)
  })

  /**
   * 加载历史记录列表
   * 会自动修正超出范围的页码
   * 
   * @returns {Promise<Array>} 加载完成的记录列表
   */
  const loadHistoryList = async () => {
    loading.value = true
    
    const [err, records] = await to(fetchAllRecords(api, searchKeyword.value))
    if (err) {
      loading.value = false
      throw err
    }

    historyList.value = records

    const maxPage = Math.max(1, Math.ceil(groupedHistoryList.value.length / pageSize.value) || 1)
    if (page.value > maxPage) page.value = maxPage
    if (page.value < 1) page.value = 1

    loading.value = false
    return historyList.value
  }

  /** 防抖搜索触发器（300ms） */
  const triggerSearch = createDebounce(async () => {
    resetToFirstPage()
    const [searchErr] = await to(loadHistoryList())
    if (searchErr) ElMessage.error(searchErr?.response?.data?.message || searchErr?.message || '历史记录加载失败')
  }, 300)

  /** 搜索输入事件处理 */
  const onKeywordInput = () => triggerSearch()

  /** 页码变化处理 */
  const handleCurrentChange = (val) => page.value = Number(val || 1)

  /** 每页条数变化处理（重新加载数据） */
  const handleSizeChange = async (val) => {
    pageSize.value = Number(val || 5)
    resetToFirstPage()
    const [sizeErr] = await to(loadHistoryList())
    if (sizeErr) ElMessage.error(sizeErr?.response?.data?.message || sizeErr?.message || '历史记录加载失败')
  }

  /**
   * 保存报价单（创建或更新）
   * 
   * @param {Object} payload - 报价单数据
   * @param {number|null} [editingId=null] - 编辑时传入 ID，新建时为 null
   * @returns {Promise<Object>} 保存后的记录
   */
  const saveQuotation = async (payload, editingId = null) => {
    const body = clone(payload)

    if (editingId) {
      const result = await withActionLock(editingId, async () => api.update(editingId, body))
      const record = normalizeRecord(result?.quotation || result?.record || result)
      const index = historyList.value.findIndex(item => item.id === record.id)
      if (index !== -1) historyList.value[index] = record
      else await loadHistoryList()
      return record
    }

    const result = await api.create(body)
    const record = normalizeRecord(result?.quotation || result?.record || result)
    if (record) historyList.value.unshift(record)
    else await loadHistoryList()
    return record
  }

  /**
   * 删除历史记录（带确认弹窗和乐观更新）
   * 
   * @param {Object} record - 要删除的记录
   * @returns {Promise<boolean>} 是否删除成功
   */
  const deleteHistory = async (record) => {
    const [confirmErr] = await to(ElMessageBox.confirm(
      `确定要删除公司「${record.companyName || record.name || '-'}」的这条报价单吗？`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ))
    if (confirmErr) return false

    const snapshot = [...historyList.value]
    removeById(record.id)

    const [err] = await to(withActionLock(record.id, async () => api.remove(record.id)))
    if (err) {
      historyList.value = snapshot
      ElMessage.error(err?.message || err?.response?.data?.message || '删除失败')
      return false
    }

    await loadHistoryList()
    ElMessage.success('删除成功')
    return true
  }

  /** 查看模式：加载到编辑器（只读） */
  const viewHistory = (record) => loadToEditor(record, 'view')

  /** 编辑模式：加载到编辑器（可编辑） */
  const editHistory = (record) => loadToEditor(record, 'edit')

  return {
    historyList,
    groupedHistoryList,
    pagedHistoryGroups,
    searchKeyword,
    page,
    pageSize,
    total,
    loading,
    isActionLoading,
    loadHistoryList,
    onKeywordInput,
    handleCurrentChange,
    handleSizeChange,
    saveQuotation,
    deleteHistory,
    viewHistory,
    editHistory
  }
}
