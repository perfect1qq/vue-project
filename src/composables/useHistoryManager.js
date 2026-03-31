import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const clone = (value) => {
  if (value === null || value === undefined) return value
  return JSON.parse(JSON.stringify(value))
}

const formatDateOnly = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).split(' ')[0] || ''
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const normalizeList = (value) => (Array.isArray(value) ? value : [])

/**
 * 通用的历史记录管理 Hook
 * 支持的功能：
 * 1. 本地存储 (localStorage) 或 远程 API (CRUD) 切换。
 * 2. 统一的数据格式化 (normalizeRecord)。
 * 3. 弹窗模式管理、关键词搜索、查看/修改模式切换。
 */
export function useHistoryManager({
  storageKey, // [可选] 本地存储的 Key，若不提供则仅使用 API 或内存
  getCurrentData, // [必须] 获取当前编辑器中数据的回掉
  loadToEditor, // [必须] 加载指定记录到编辑器的回掉 (record, mode)
  getRecordName = () => `记录_${new Date().toLocaleString()}`, // 生成默认名称
  defaultNameProvider = null,
  transformData = (data) => data, // 数据在存储前的转换逻辑
  api = null // [可选] 后端 API 对象 (需满足 list, create, update, remove 接口规范)
}) {
  const historyList = ref([])
  const historyDialogVisible = ref(false)
  const searchKeyword = ref('')

  const readLocal = () => {
    if (!storageKey) return []
    const stored = localStorage.getItem(storageKey)
    if (!stored) return []
    try {
      return normalizeList(JSON.parse(stored))
    } catch {
      return []
    }
  }

  const writeLocal = (list) => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(list))
  }

  const normalizeRecord = (record) => ({
    ...record,
    id: record.id,
    name: record.name || record.title || '',
    createDate: record.createDate || formatDateOnly(record.createTime || record.createdAt),
    createTime: record.createTime || record.createdAt || '',
    updateTime: record.updateTime || record.updatedAt || ''
  })

  // 从后端或本地加载所有历史列表
  const loadHistoryList = async () => {
    if (api?.list) {
      const result = await api.list()
      const rawList = result?.list || result?.records || result?.quotations || result?.approvals || result || []
      historyList.value = normalizeList(rawList).map(normalizeRecord)
      return historyList.value
    }

    historyList.value = readLocal().map(normalizeRecord)
    return historyList.value
  }

  // 弹出名称输入框，并将当前编辑器内容保存为新纪录
  const saveAsNewHistory = async () => {
    const currentData = getCurrentData()
    if (!currentData) return false

    let defaultName = getRecordName()
    if (typeof defaultNameProvider === 'function') {
      const customName = defaultNameProvider(currentData)
      if (customName && String(customName).trim()) defaultName = String(customName).trim()
    }

    return new Promise(async (resolve, reject) => {
      try {
        const { value } = await ElMessageBox.prompt('请输入记录名称', '保存历史记录', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: defaultName,
          inputPattern: /\\S+/, 
          inputErrorMessage: '名称不能为空'
        })
        
        const name = String(value || '').trim()
        if (!name) {
          reject(new Error('名称不能为空'))
          return
        }

        const payload = {
          name,
          ...transformData(clone(currentData))
        }

        try {
          if (api?.create) {
            const result = await api.create(payload)
            const newRecord = normalizeRecord(result?.quotation || result?.record || result)
            if (newRecord) {
              historyList.value.unshift(newRecord)
            } else {
              await loadHistoryList()
            }
            ElMessage.success('已保存到历史记录')
            resolve(newRecord)
            return
          }

          const now = new Date()
          const newRecord = normalizeRecord({
            id: Date.now(),
            name,
            ...transformData(clone(currentData)),
            createTime: now.toLocaleString(),
            createDate: formatDateOnly(now)
          })
          historyList.value.unshift(newRecord)
          writeLocal(historyList.value)
          ElMessage.success('已保存到历史记录')
          resolve(newRecord)
        } catch (error) {
          ElMessage.error(error?.response?.data?.message || '保存失败')
          reject(error)
        }
      } catch {
        reject(new Error('已取消'))
      }
    })
  }

  const updateHistory = async (id, newData) => {
    const index = historyList.value.findIndex(h => h.id === id)
    if (index === -1) return false

    try {
      const payload = {
        ...transformData(clone(newData)),
        name: historyList.value[index].name
      }

      if (api?.update) {
        const result = await api.update(id, payload)
        const updated = normalizeRecord(result?.quotation || result?.record || result)
        historyList.value[index] = updated || { ...historyList.value[index], ...payload, updateTime: new Date().toLocaleString() }
      } else {
        historyList.value[index] = {
          ...historyList.value[index],
          ...transformData(clone(newData)),
          updateTime: new Date().toLocaleString()
        }
        writeLocal(historyList.value)
      }

      ElMessage.success('历史记录已更新')
      return true
    } catch (error) {
      ElMessage.error(error?.response?.data?.message || '更新失败')
      return false
    }
  }

  const deleteHistory = async (record) => {
    try {
      await ElMessageBox.confirm(`确定要删除历史记录“${record.name}”吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      
      try {
        if (api?.remove) {
          await api.remove(record.id)
        }
        const index = historyList.value.findIndex(h => h.id === record.id)
        if (index !== -1) {
          historyList.value.splice(index, 1)
          writeLocal(historyList.value)
          ElMessage.success('删除成功')
        }
      } catch (error) {
        ElMessage.error(error?.response?.data?.message || '删除失败')
      }
    } catch {
      // 用户取消删除
    }
  }

  const clearAllHistory = async () => {
    if (!historyList.value.length) {
      ElMessage.warning('暂无历史记录')
      return
    }

    await ElMessageBox.confirm('确定要删除所有历史记录吗？此操作不可恢复。', '提示', {
      confirmButtonText: '确认清空',
      cancelButtonText: '取消',
      type: 'warning'
    })

    try {
      if (api?.clear) {
        await api.clear()
      }
      historyList.value = []
      writeLocal(historyList.value)
      ElMessage.success('已清空所有历史记录')
    } catch (error) {
      ElMessage.error(error?.response?.data?.message || '清空失败')
    }
  }

  const openHistoryDialog = async () => {
    await loadHistoryList()
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
    return historyList.value.filter(record => String(record.name || '').toLowerCase().includes(kw))
  })

  return {
    historyList,
    historyDialogVisible,
    searchKeyword,
    filteredHistoryList,
    loadHistoryList,
    saveAsNewHistory,
    updateHistory,
    deleteHistory,
    clearAllHistory,
    openHistoryDialog,
    viewHistory,
    editHistory
  }
}
