import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deepClone } from '../utils/helpers'

/**
 * 通用的可编辑表格逻辑 Hook
 * 处理表格行的：增、删、清空、批量删除、数据快照、变动检测等。
 */
export function useEditableTable({ createEmptyItem, validateItem, enableDelete = true }) {
  const items = ref([createEmptyItem()]) // 表格行数据
  const mode = ref('edit') // 状态：edit-编辑 / view-查看
  const editingHistoryId = ref(null) // 记录 ID (如果是从历史加载)
  const originalSnapshot = ref(null) // 数据初始快照 (用于检测是否有未保存的变动)


  const isViewMode = computed(() => mode.value === 'view')
  const isHistoryMode = computed(() => editingHistoryId.value !== null)

  const resetToEmpty = () => {
    items.value = [createEmptyItem()]
    mode.value = 'edit'
    editingHistoryId.value = null
    originalSnapshot.value = null
  }

  const addRow = () => {
    if (isViewMode.value) return
    items.value.push(createEmptyItem())
  }

  const deleteRow = (index) => {
    if (isViewMode.value || !enableDelete) return
    items.value.splice(index, 1)
    if (!items.value.length) items.value.push(createEmptyItem())
  }

  const deleteSelectedRows = async (selectedRows = []) => {
    if (isViewMode.value || !enableDelete || !selectedRows.length) return

    try {
      await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.length} 行吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      items.value = items.value.filter(item => !selectedRows.includes(item))
      if (!items.value.length) items.value.push(createEmptyItem())
      ElMessage.success('删除成功')
    } catch {
      // 用户取消
    }
  }

  const clearAll = async () => {
    if (isViewMode.value) return
    try {
      await ElMessageBox.confirm('清空后将丢失所有数据，确认清空吗？', '提示', {
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        type: 'warning'
      })
      items.value = [createEmptyItem()]
      ElMessage.success('已清空')
    } catch {
      // 用户取消
    }
  }

  const isDataComplete = () => items.value.length > 0 && items.value.every(item => validateItem(item)) // 校验所有行是否合法
  const getSnapshot = () => deepClone(items.value) // 获取当前表格数据的深拷贝快照

  // 检测当前表格数据是否与传入的快照一致 (判断是否有过修改)
  const hasChanges = (snapshot) => {
    if (!snapshot) return true
    return JSON.stringify(getSnapshot()) !== JSON.stringify(snapshot)
  }

  const loadDataToEditor = (data, newMode = 'edit', historyId = null) => {
    items.value = deepClone(Array.isArray(data) ? data : [createEmptyItem()])
    if (!items.value.length) items.value = [createEmptyItem()]
    mode.value = newMode
    editingHistoryId.value = historyId
    originalSnapshot.value = deepClone(items.value)
  }

  const setEditMode = () => {
    mode.value = 'edit'
  }

  return {
    items,
    mode,
    editingHistoryId,
    originalSnapshot,
    isViewMode,
    isHistoryMode,
    resetToEmpty,
    addRow,
    deleteRow,
    deleteSelectedRows,
    clearAll,
    isDataComplete,
    getSnapshot,
    hasChanges,
    loadDataToEditor,
    setEditMode
  }
}
