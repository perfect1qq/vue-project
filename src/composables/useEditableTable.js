import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deepClone } from '../utils/helpers'

export function useEditableTable({ createEmptyItem, validateItem, enableDelete = true }) {
  const items = ref([createEmptyItem()])
  const mode = ref('edit')
  const editingHistoryId = ref(null)
  const originalSnapshot = ref(null)

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

  const deleteSelectedRows = (selectedRows = []) => {
    if (isViewMode.value || !enableDelete || !selectedRows.length) return

    ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.length} 行吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        items.value = items.value.filter(item => !selectedRows.includes(item))
        if (!items.value.length) items.value.push(createEmptyItem())
        ElMessage.success('删除成功')
      })
      .catch(() => {})
  }

  const clearAll = () => {
    if (isViewMode.value) return
    ElMessageBox.confirm('清空后将丢失所有数据，确认清空吗？', '提示', {
      confirmButtonText: '确认清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        items.value = [createEmptyItem()]
        ElMessage.success('已清空')
      })
      .catch(() => {})
  }

  const isDataComplete = () => items.value.length > 0 && items.value.every(item => validateItem(item))
  const getSnapshot = () => deepClone(items.value)

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
