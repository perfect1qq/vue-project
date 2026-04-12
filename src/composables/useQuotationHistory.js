import { computed, ref, shallowRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createDebounce } from '@/utils/debounce'
import { useInstantListActions } from '@/composables/useInstantListActions'
import { useListQueryState } from '@/composables/useListQueryState'

const clone = (value) => (value === null || value === undefined ? value : JSON.parse(JSON.stringify(value)))

const formatDateOnly = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).split(' ')[0] || ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const normalizeRecord = (record = {}) => ({
  ...record,
  id: record.id,
  companyName: record.companyName || record.name || record.title || '',
  name: record.name || record.companyName || record.title || '',
  createDate: record.createDate || formatDateOnly(record.createTime || record.createdAt),
  createTime: record.createTime || record.createdAt || '',
  updateTime: record.updateTime || record.updatedAt || ''
})

const hasPaginationMeta = (result) => Boolean(result && (Object.prototype.hasOwnProperty.call(result, 'total') || Object.prototype.hasOwnProperty.call(result, 'page') || Object.prototype.hasOwnProperty.call(result, 'pageSize')))

const normalizeCompanyName = (record = {}) => String(record.companyName || record.name || record.title || '未命名公司').trim() || '未命名公司'

const toDateValue = (record = {}) => {
  const value = record.createTime || record.updateTime || record.createDate || ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const groupByCompany = (records = []) => {
  const map = new Map()

  records.forEach((record) => {
    const companyName = normalizeCompanyName(record)
    if (!map.has(companyName)) {
      map.set(companyName, {
        companyName,
        records: []
      })
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

export function useQuotationHistory({ api, loadToEditor }) {
  const historyList = shallowRef([])
  const groupedHistoryList = computed(() => groupByCompany(historyList.value))
  const { isActionLoading, withActionLock, removeById } = useInstantListActions(historyList)
  const { page, pageSize, keyword: searchKeyword, resetToFirstPage } = useListQueryState({ page: 1, pageSize: 10, keyword: '' })
  const loading = ref(false)

  const total = computed(() => groupedHistoryList.value.length)

  const pagedHistoryGroups = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return groupedHistoryList.value.slice(start, start + pageSize.value)
  })

  const loadHistoryList = async () => {
    loading.value = true
    try {
      const records = await fetchAllRecords(api, searchKeyword.value)
      historyList.value = records

      const maxPage = Math.max(1, Math.ceil(groupedHistoryList.value.length / pageSize.value) || 1)
      if (page.value > maxPage) page.value = maxPage
      if (page.value < 1) page.value = 1

      return historyList.value
    } finally {
      loading.value = false
    }
  }

  const triggerSearch = createDebounce(async () => {
    try {
      resetToFirstPage()
      await loadHistoryList()
    } catch (error) {
      ElMessage.error(error?.response?.data?.message || error?.message || '历史记录加载失败')
    }
  }, 300)

  const onKeywordInput = () => {
    triggerSearch()
  }

  const handleCurrentChange = (val) => {
    page.value = Number(val || 1)
  }

  const handleSizeChange = async (val) => {
    try {
      pageSize.value = Number(val || 5)
      resetToFirstPage()
      await loadHistoryList()
    } catch (error) {
      ElMessage.error(error?.response?.data?.message || error?.message || '历史记录加载失败')
    }
  }

  const saveQuotation = async (payload, editingId = null) => {
    const body = clone(payload)
    if (editingId) {
      const result = await withActionLock(editingId, async () => api.update(editingId, body))
      const record = normalizeRecord(result?.quotation || result?.record || result)
      const index = historyList.value.findIndex(item => item.id === record.id)
      if (index !== -1) historyList.value[index] = record
      else await loadHistoryList()
      ElMessage.success('报价单已更新')
      return record
    }

    const result = await api.create(body)
    const record = normalizeRecord(result?.quotation || result?.record || result)
    if (record) historyList.value.unshift(record)
    else await loadHistoryList()
    ElMessage.success('报价单已保存')
    return record
  }

  const deleteHistory = async (record) => {
    try {
      await ElMessageBox.confirm(`确定要删除公司「${record.companyName || record.name || '-'}」的这条报价单吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return false
    }

    const snapshot = [...historyList.value]
    removeById(record.id)
    try {
      await withActionLock(record.id, async () => {
        await api.remove(record.id)
      })
      await loadHistoryList()
      ElMessage.success('删除成功')
      return true
    } catch (error) {
      historyList.value = snapshot
      ElMessage.error(error?.message || error?.response?.data?.message || '删除失败')
      return false
    }
  }

  const viewHistory = (record) => {
    loadToEditor(record, 'view')
  }

  const editHistory = (record) => {
    loadToEditor(record, 'edit')
  }

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
