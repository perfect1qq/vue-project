import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

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

export function useQuotationHistory({ api, loadToEditor }) {
  const historyList = ref([])
  const historyDialogVisible = ref(false)
  const searchKeyword = ref('')
  const loading = ref(false)

  const loadHistoryList = async () => {
    loading.value = true
    try {
      const result = await api.list()
      const rawList = result?.quotations || result?.records || result?.list || result || []
      historyList.value = Array.isArray(rawList) ? rawList.map(normalizeRecord) : []
      return historyList.value
    } finally {
      loading.value = false
    }
  }

  const filteredHistoryList = computed(() => {
    const kw = searchKeyword.value.trim().toLowerCase()
    if (!kw) return historyList.value
    return historyList.value.filter(record => {
      const target = `${record.companyName || ''} ${record.name || ''} ${record.quotationNo || ''}`.toLowerCase()
      return target.includes(kw)
    })
  })

  const openHistoryDialog = async () => {
    await loadHistoryList()
    historyDialogVisible.value = true
  }

  const saveQuotation = async (payload, editingId = null) => {
    const body = clone(payload)
    if (editingId) {
      const result = await api.update(editingId, body)
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

    await api.remove(record.id)
    historyList.value = historyList.value.filter(item => item.id !== record.id)
    ElMessage.success('删除成功')
    return true
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
    filteredHistoryList,
    loadHistoryList,
    openHistoryDialog,
    saveQuotation,
    deleteHistory,
    viewHistory,
    editHistory
  }
}
