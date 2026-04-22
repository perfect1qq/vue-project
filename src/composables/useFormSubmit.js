/**
 * @module composables/useFormSubmit
 * @description 表单提交防重复工具
 *
 * 功能：
 * - 防止表单重复提交（锁定机制）
 * - 自动管理加载状态
 * - 统一错误处理
 *
 * 使用示例：
 * ```javascript
 * const { submitLoading, withSubmitLock } = useFormSubmit()
 *
 * const handleSubmit = async () => {
 *   await withSubmitLock(async () => {
 *     // 提交逻辑...
 *   })
 * }
 * ```
 */

import { ref } from 'vue'

/**
 * 创建表单提交锁实例
 * @param {Object} [options] - 配置选项
 * @param {number} [options.lockDuration=300] - 锁定持续时间（毫秒）
 * @returns {Object} 提交控制对象
 */
export const useFormSubmit = (options = {}) => {
  const { lockDuration = 300 } = options

  /** 是否正在提交 */
  const submitLoading = ref(false)

  /** 上次提交时间戳 */
  let lastSubmitTime = 0

  /**
   * 带锁定的提交包装器
   * @param {Function} fn - 异步提交函数
   * @returns {Promise<any>} 提交结果
   */
  const withSubmitLock = async (fn) => {
    // 检查是否正在提交或刚提交过
    if (submitLoading.value) {
      console.warn('[useFormSubmit] 正在提交中，请勿重复操作')
      return null
    }

    const now = Date.now()
    if (now - lastSubmitTime < lockDuration) {
      console.warn(`[useFormSubmit] 操作过于频繁，请等待 ${lockDuration}ms`)
      return null
    }

    // 加锁
    submitLoading.value = true
    lastSubmitTime = now

    try {
      // 执行提交逻辑
      const result = await fn()
      return result
    } catch (error) {
      // 错误已在外层处理，这里只负责解锁
      throw error
    } finally {
      // 解锁（延迟解锁，防止快速连续点击）
      setTimeout(() => {
        submitLoading.value = false
      }, lockDuration)
    }
  }

  /**
   * 重置提交状态
   */
  const resetSubmitState = () => {
    submitLoading.value = false
    lastSubmitTime = 0
  }

  return {
    /** 是否正在提交（可用于绑定按钮 loading 状态） */
    submitLoading,
    /** 带锁定的提交包装函数 */
    withSubmitLock,
    /** 重置提交状态 */
    resetSubmitState
  }
}

export default useFormSubmit
