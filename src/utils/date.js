/**
 * @module utils/date
 * @description 日期格式化工具
 *
 * 提供常用的日期格式化函数：
 * - formatDate: 格式化日期（支持多种格式）
 * - formatDateTime: 格式化日期时间
 * - formatDateOnly: 只提取日期部分（YYYY-MM-DD）【向后兼容】
 */

/**
 * 格式化日期为指定格式字符串
 *
 * @param {string|Date|number} value - 日期值（字符串、Date 对象或时间戳）
 * @param {string} [format='YYYY-MM-DD'] - 目标格式
 *   - 'YYYY-MM-DD': 2024-01-15
 *   - 'YYYY-MM-DD HH:mm': 2024-01-15 14:30
 *   - 'YYYY/MM/DD': 2024/01/15
 *   - 'MM-DD': 01-15
 * @returns {string} 格式化后的日期字符串，无效输入返回空字符串
 *
 * @example
 * formatDate(new Date()) // '2026-04-22'
 * formatDate('2026-04-22T14:30:00', 'YYYY-MM-DD HH:mm') // '2026-04-22 14:30'
 */
const formatDate = (value, format = 'YYYY-MM-DD') => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).split(' ')[0] || ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  switch (format) {
    case 'YYYY-MM-DD HH:mm':
      return `${year}-${month}-${day} ${hours}:${minutes}`
    case 'YYYY/MM/DD':
      return `${year}/${month}/${day}`
    case 'MM-DD':
      return `${month}-${day}`
    case 'YYYY-MM-DD':
    default:
      return `${year}-${month}-${day}`
  }
}

/**
 * 格式化日期时间（年月日 时分）
 *
 * @param {string|Date|number} value - 日期值
 * @returns {string} 格式化后的日期时间字符串，如 "2026-04-22 14:30"
 */
const formatDateTime = (value) => formatDate(value, 'YYYY-MM-DD HH:mm')

/**
 * 格式化日期为 YYYY-MM-DD 字符串（仅日期，不含时间）
 *
 * @deprecated 请使用 formatDate 替代，此函数保留向后兼容
 * @param {string|Date|number} value - 日期值
 * @returns {string} 格式化后的日期字符串
 */
const formatDateOnly = (value) => formatDate(value, 'YYYY-MM-DD')

export { formatDate, formatDateTime, formatDateOnly }
