import { ref } from 'vue'

/**
 * 列表即时更新辅助工具：
 * - 提供乐观更新（先改界面，再请求）
 * - 请求失败时自动回滚
 * - 可选在成功后触发一次轻量回源刷新
 */
export const useInstantListActions = (listRef) => {
  const actionLoadingMap = ref({})

  const isActionLoading = (id) => Boolean(actionLoadingMap.value[id])

  const withActionLock = async (id, task) => {
    if (!id || isActionLoading(id)) return false
    actionLoadingMap.value = { ...actionLoadingMap.value, [id]: true }
    try {
      return await task()
    } finally {
      const next = { ...actionLoadingMap.value }
      delete next[id]
      actionLoadingMap.value = next
    }
  }

  const replaceById = (id, updater) => {
    listRef.value = (listRef.value || []).map((item) => {
      if (item.id !== id) return item
      return typeof updater === 'function' ? updater(item) : { ...item, ...(updater || {}) }
    })
  }

  const removeById = (id) => {
    listRef.value = (listRef.value || []).filter(item => item.id !== id)
  }

  return {
    actionLoadingMap,
    isActionLoading,
    withActionLock,
    replaceById,
    removeById
  }
}
