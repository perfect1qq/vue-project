import { onUnmounted, ref } from 'vue'

/**
 * 通用可取消加载器：
 * - 新请求会自动取消上一次请求
 * - 仅最后一次请求允许回写页面状态
 */
export const useCancelableLoader = () => {
  const loading = ref(false)
  const loadError = ref('')
  let abortController = null
  let requestSeq = 0

  const run = async (task) => {
    if (abortController) abortController.abort()
    abortController = new AbortController()
    const signal = abortController.signal
    const seq = ++requestSeq

    loading.value = true
    loadError.value = ''

    try {
      const result = await task({ signal, seq })
      return { ok: true, canceled: false, result, seq }
    } catch (error) {
      if (error?.code === 'ERR_CANCELED') {
        return { ok: false, canceled: true, error, seq }
      }
      loadError.value = error?.response?.data?.message || error?.message || '请求失败'
      return { ok: false, canceled: false, error, seq }
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  }

  const isLatest = (seq) => seq === requestSeq

  onUnmounted(() => {
    if (abortController) abortController.abort()
  })

  return {
    loading,
    loadError,
    run,
    isLatest
  }
}
