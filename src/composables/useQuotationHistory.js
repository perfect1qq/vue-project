import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createDebounce } from '@/utils/debounce'
import { useInstantListActions } from '@/composables/useInstantListActions'

const clone = (value) => (value === null || value === undefined ? value : JSON.parse(JSON.stringify(value)))

const formatDateOnly = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).split(' ')[0] || ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const normalizeRecord = (record) => ({
  ...record,
  id: record.id,
  companyName: record.companyName || record.name || record.title || '',
  name: record.name || record.companyName || record.title || '',
  createDate: record.createDate || formatDateOnly(record.createTime || record.createdAt),
  createTime: record.createTime || record.createdAt || '',
  updateTime: record.updateTime || record.updatedAt || ''
})

const groupByCompany = (list) => {
  const map = new Map()
  list.forEach((record) => {
    const key = String(record.companyName || record.name || '未命名报价单').trim() || '未命名报价单'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(record)
  })
  return Array.from(map.entries()).map(([companyName, records]) => ({
    companyName,
    count: records.length,
    records: records.sort((a, b) => new Date(b.createdAt || b.createTime || 0) - new Date(a.createdAt || a.createTime || 0))
  }))
}

export function useQuotationHistory({ api, loadToEditor }) {
  const historyList = ref([])
  const { isActionLoading, withActionLock, removeById } = useInstantListActions(historyList)
  const historyDialogVisible = ref(false)
  const searchKeyword = ref('')
  const loading = ref(false)
  const page = ref(1)
  const pageSize = ref(50)
  const total = ref(0)
  let listAbortController = null
  let listRequestSeq = 0

  const loadHistoryList = async () => {
    if (listAbortController) listAbortController.abort()
    listAbortController = new AbortController()
    const requestSeq = ++listRequestSeq
    loading.value = true
    try {
      const result = await api.list(
        {
          page: page.value,
          pageSize: pageSize.value,
          keyword: searchKeyword.value.trim()
        },
        { signal: listAbortController.signal }
      )
      if (requestSeq !== listRequestSeq) return historyList.value
      const rawList = result?.quotations || result?.records || result?.list || result || []
      historyList.value = Array.isArray(rawList) ? rawList.map(normalizeRecord) : []
      total.value = Number(result?.total || historyList.value.length)
      return historyList.value
    } catch (error) {
      if (error?.code === 'ERR_CANCELED') return historyList.value
      throw error
    } finally {
      if (requestSeq === listRequestSeq) loading.value = false
    }
  }

  const groupedHistoryList = ref([])
  const rebuildGroupedList = () => {
    groupedHistoryList.value = groupByCompany(historyList.value)
  }

  const openHistoryDialog = async () => {
    page.value = 1
    await loadHistoryList()
    rebuildGroupedList()
    historyDialogVisible.value = true
  }

  const handlePageChange = async (val) => {
    page.value = Number(val || 1)
    await loadHistoryList()
    rebuildGroupedList()
  }

  const handlePageSizeChange = async (val) => {
    pageSize.value = Number(val || 50)
    page.value = 1
    await loadHistoryList()
    rebuildGroupedList()
  }

  const triggerSearch = createDebounce(async () => {
    page.value = 1
    await loadHistoryList()
    rebuildGroupedList()
  }, 300)

  const onKeywordInput = () => {
    triggerSearch()
  }

  const saveQuotation = async (payload, editingId = null) => {
    const body = clone(payload)
    if (editingId) {
      const result = await withActionLock(editingId, async () => api.update(editingId, body))
      const record = normalizeRecord(result?.quotation || result?.record || result)
      const index = historyList.value.findIndex(item => item.id === record.id)
      if (index !== -1) historyList.value[index] = record
      else await loadHistoryList()
      rebuildGroupedList()
      ElMessage.success('报价单已更新')
      return record
    }

    const result = await api.create(body)
    const record = normalizeRecord(result?.quotation || result?.record || result)
    if (record) historyList.value.unshift(record)
    else await loadHistoryList()
    rebuildGroupedList()
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
    total.value = Math.max(0, total.value - 1)
    rebuildGroupedList()
    try {
      await withActionLock(record.id, async () => {
        await api.remove(record.id)
      })
      ElMessage.success('删除成功')
      return true
    } catch (error) {
      historyList.value = snapshot
      total.value = Number(snapshot.length)
      rebuildGroupedList()
      ElMessage.error(error?.message || error?.response?.data?.message || '删除失败')
      return false
    }
  }

  const viewHistory = (record) => {
    historyDialogVisible.value = false
    loadToEditor(record, 'view')
  }

  const editHistory = (record) => {
    historyDialogVisible.value = false
    loadToEditor(record, 'edit')
  }

  return {
    historyList,
    historyDialogVisible,
    searchKeyword,
    loading,
    page,
    pageSize,
    total,
    groupedHistoryList,
    isActionLoading,
    loadHistoryList,
    openHistoryDialog,
    handlePageChange,
    handlePageSizeChange,
    onKeywordInput,
    saveQuotation,
    deleteHistory,
    viewHistory,
    editHistory
  }
}
