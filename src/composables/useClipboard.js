/**
 * @module composables/useClipboard
 * @description 剪贴板操作组合式函数
 *
 * 功能说明：
 * - 提供通用的文本复制到剪贴板能力
 * - 自动处理复制成功/失败的提示反馈
 * - 使用 Clipboard API（现代浏览器支持）
 *
 * 技术细节：
 * - 使用 navigator.clipboard.writeText() API
 * - 自动捕获异常并显示错误提示
 * - 支持自定义成功提示消息
 *
 * 浏览器兼容性：
 * - Chrome 66+
 * - Firefox 63+
 * - Safari 13.1+
 * - Edge 79+
 *
 * @example
 * // 在组件中使用
 * const { copy } = useClipboard()
 *
 * // 复制文本
 * const handleCopy = () => {
 *   copy('要复制的文本内容', '复制成功！')
 * }
 */

import { showError, showSuccess } from '@/utils/message'

/**
 * 剪贴板操作 composable
 *
 * 提供安全的文本复制功能，包含：
 * - 空值检查
 * - 异常捕获
 * - 用户反馈提示
 *
 * @returns {Object} 剪贴板操作方法
 * @returns {Function} returns.copy - 复制文本到剪贴板
 */
export const useClipboard = () => {
  /**
   * 复制文本到系统剪贴板
   *
   * 完整流程：
   * 1. 检查文本是否为空
   * 2. 调用 Clipboard API 写入剪贴板
   * 3. 显示成功/失败提示
   * 4. 返回操作结果
   *
   * @param {string} text - 要复制的文本内容
   * @param {string} [successMsg='已复制到剪贴板'] - 复制成功时的提示文字
   * @returns {Promise<boolean>} 是否复制成功
   *
   * @example
   * const success = await copy('Hello World', '已复制')
   * if (success) {
   *   console.log('用户可以粘贴了')
   * }
   */
  const copy = async (text, successMsg = '已复制到剪贴板') => {
    if (!text) return false

    try {
      await navigator.clipboard.writeText(text)
      showSuccess(successMsg)
      return true
    } catch {
      showError('复制失败，请手动复制')
      return false
    }
  }

  return { copy }
}
