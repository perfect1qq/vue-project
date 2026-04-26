/**
 * @file utils/message.js
 * @description 全局消息提示工具（基于 Element Plus ElMessage）
 *
 * 功能说明：
 * - 封装 Element Plus 的消息提示组件
 * - 提供统一的错误/成功/警告/信息提示方法
 * - 自动从错误对象中提取可读的消息文本
 * - 兜底处理：ElMessage 不可用时使用 console/alert
 *
 * 使用示例：
 * import { showError, showSuccess } from '@/utils/message'
 *
 * // 显示错误提示
 * showError(new Error('网络连接失败'))
 *
 * // 显示成功提示
 * showSuccess('保存成功')
 */

import { ElMessage } from 'element-plus'

/**
 * 从错误对象中提取用户友好的消息文本
 *
 * 提取优先级：
 * 1. Axios 响应中的 data.message（后端返回的业务错误）
 * 2. Error 对象的 message 属性（原生错误信息）
 * 3. 兜底默认值
 *
 * @param {Error|*} err - 错误对象（可能为 null/undefined）
 * @param {string} [fallback='操作失败'] - 无法提取时的兜底文案
 * @returns {string} 提取到的消息文本
 */
const extractMessage = (err, fallback = '操作失败') => {
  if (!err) return fallback
  return (
    err?.response?.data?.message || err?.message || fallback
  )
}

/**
 * 显示错误消息（红色）
 *
 * 自动从错误对象提取消息，支持多种错误类型：
 * - Axios 错误（含 response.data.message）
 * - 标准 Error 对象
 * - 字符串错误消息
 *
 * @param {Error|string|null} err - 错误对象或消息字符串
 * @param {string} [fallback='操作失败'] - 兜底文案
 */
const showError = (err, fallback = '操作失败') => {
  const msg = extractMessage(err, fallback)
  try {
    ElMessage.error(msg)
  } catch (e) {
    console.error('[showError]', msg)
    alert(msg)
  }
}

/**
 * 显示成功消息（绿色）
 *
 * @param {string} [msg='操作成功'] - 成功提示文案
 */
const showSuccess = (msg = '操作成功') => {
  try {
    ElMessage.success(msg)
  } catch (e) {
    console.log('[showSuccess]', msg)
  }
}

/**
 * 显示警告消息（橙色）
 *
 * @param {string} msg - 警告提示文案
 */
const showWarning = (msg) => {
  try {
    ElMessage.warning(msg)
  } catch (e) {
    console.warn('[showWarning]', msg)
  }
}

/**
 * 显示普通信息消息（灰色）
 *
 * @param {string} msg - 信息提示文案
 */
const showInfo = (msg) => {
  try {
    ElMessage.info(msg)
  } catch (e) {
    console.info('[showInfo]', msg)
  }
}

export {
  showError,
  showSuccess,
  showWarning,
  showInfo,
  extractMessage,
}
