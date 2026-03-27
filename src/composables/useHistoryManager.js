import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

export function useHistoryManager({
  storageKey,
  getCurrentData,
  loadToEditor,
  getRecordName = () => `记录_${new Date().toLocaleString()}`,
  defaultNameProvider = null,
  transformData = (data) => data  // 新增：保存时转换数据
}) {
  const historyList = ref([])
  const historyDialogVisible = ref(false)
  const searchKeyword = ref('')

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr.split(' ')[0]
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  }

  const loadHistoryList = () => {
    const stored = localStorage.getItem(storageKey)
    historyList.value = stored ? JSON.parse(stored) : []
    historyList.value.forEach(record => {
      if (!record.createDate && record.createTime) {
        record.createDate = formatDateOnly(record.createTime)
      }
    })
  }

  const saveHistoryToLocal = () => {
    localStorage.setItem(storageKey, JSON.stringify(historyList.value))
  }

  const checkNameDuplicate = (name, excludeId = null) => {
    return historyList.value.some(record => record.name === name && record.id !== excludeId)
  }

  const saveAsNewHistory = async () => {
    const currentData = getCurrentData()
    if (!currentData) return false

    let defaultName = getRecordName()
    if (defaultNameProvider && typeof defaultNameProvider === 'function') {
      const customName = defaultNameProvider(currentData)
      if (customName && customName.trim()) defaultName = customName.trim()
    }

    return new Promise((resolve, reject) => {
      ElMessageBox.prompt('请输入记录名称', '保存历史记录', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: defaultName,
        inputPattern: /\S+/,
        inputErrorMessage: '名称不能为空'
      }).then(({ value }) => {
        const name = value.trim()
        if (checkNameDuplicate(name)) {
          ElMessage.warning('已存在相同名称的记录，请修改名称后再保存')
          reject(false)
          return
        }
        const now = new Date()
        const transformed = transformData(currentData)
        const newRecord = {
          id: Date.now(),
          name,
          ...transformed,  // 存储转换后的数据
          createTime: now.toLocaleString(),
          createDate: formatDateOnly(now)
        }
        historyList.value.unshift(newRecord)
        saveHistoryToLocal()
        ElMessage.success('已保存到历史记录')
        resolve(newRecord)
      }).catch(() => reject(false))
    })
  }

  const updateHistory = (id, newData) => {
    const index = historyList.value.findIndex(h => h.id === id)
    if (index === -1) return false
    const transformed = transformData(newData)
    historyList.value[index] = {
      ...historyList.value[index],
      ...transformed,
      updateTime: new Date().toLocaleString()
    }
    saveHistoryToLocal()
    ElMessage.success('历史记录已更新')
    return true
  }

  const deleteHistory = (record) => {
    ElMessageBox.confirm(`确定要删除历史记录“${record.name}”吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      const index = historyList.value.findIndex(h => h.id === record.id)
      if (index !== -1) {
        historyList.value.splice(index, 1)
        saveHistoryToLocal()
        ElMessage.success('删除成功')
      }
    }).catch(() => {})
  }

  const clearAllHistory = async () => {
    if (!historyList.value.length) {
      ElMessage.warning('暂无历史记录')
      return
    }
    await ElMessageBox.confirm('确定要删除所有历史记录吗？此操作不可恢复。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    historyList.value = []
    saveHistoryToLocal()
    ElMessage.success('已清空所有历史记录')
  }

  const openHistoryDialog = () => {
    loadHistoryList()
    historyDialogVisible.value = true
  }

  const viewHistory = (record) => {
    historyDialogVisible.value = false
    loadToEditor(record, 'view')
  }

  const editHistory = (record) => {
    historyDialogVisible.value = false
    loadToEditor(record, 'edit')
  }

  const filteredHistoryList = computed(() => {
    if (!searchKeyword.value) return historyList.value
    const kw = searchKeyword.value.toLowerCase()
    return historyList.value.filter(record => record.name.toLowerCase().includes(kw))
  })

  return {
    historyList,
    historyDialogVisible,
    searchKeyword,
    filteredHistoryList,
    loadHistoryList,
    saveHistoryToLocal,
    saveAsNewHistory,
    updateHistory,
    deleteHistory,
    clearAllHistory,
    openHistoryDialog,
    viewHistory,
    editHistory,
    checkNameDuplicate
  }
}