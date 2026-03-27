// src/composables/useEditableTable.js
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deepClone } from '../utils/helpers'

/**
 * 通用可编辑表格组合
 * @param {Object} options
 * @param {Function} options.createEmptyItem - 创建空数据项
 * @param {Function} options.validateItem - 验证单行数据完整性
 * @param {boolean} [options.enableDelete] - 是否启用删除功能
 */
export function useEditableTable({ createEmptyItem, validateItem, enableDelete = true }) {
  const items = ref([])
  const mode = ref('edit') // 'edit' 或 'view'
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

  const deleteSelectedRows = (selectedRows) => {
    if (isViewMode.value || !enableDelete || !selectedRows.length) return
    ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.length} 行吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      items.value = items.value.filter(item => !selectedRows.includes(item))
      if (!items.value.length) items.value.push(createEmptyItem())
      ElMessage.success('删除成功')
    }).catch(() => {})
  }

  const clearAll = () => {
    if (isViewMode.value) return
    ElMessageBox.confirm('清空后将丢失所有数据，确认清空吗？', '提示', {
      confirmButtonText: '确认清空',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      items.value = [createEmptyItem()]
      ElMessage.success('已清空')
    }).catch(() => {})
  }

  const isDataComplete = () => {
    if (!items.value.length) return false
    return items.value.every(item => validateItem(item))
  }

  const getSnapshot = () => deepClone(items.value)

  const hasChanges = (snapshot) => {
    if (!snapshot) return true
    const current = getSnapshot()
    return JSON.stringify(current) !== JSON.stringify(snapshot)
  }

  const loadDataToEditor = (data, newMode, historyId) => {
    items.value = deepClone(data)
    mode.value = newMode
    editingHistoryId.value = historyId
    originalSnapshot.value = deepClone(data)
  }
const resetToDefault = (defaultRowCreator) => {
  items.value = [defaultRowCreator()]
  mode.value = 'edit'
  editingHistoryId.value = null
  originalSnapshot.value = null
}
  const setEditMode = () => { mode.value = 'edit' }

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
    setEditMode,
    resetToDefault
  }
}