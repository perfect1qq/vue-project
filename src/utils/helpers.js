// src/utils/helpers.js

/**
 * 从字符串中提取数字（支持整数和小数）
 * 逻辑：匹配字符串开头的数字和小数点
 * @param {string|number} str
 * @returns {number}
 */
export const extractNumber = (str) => {
  // 使用可选链处理正则匹配结果，?? 确保无匹配时返回 0
  const match = String(str ?? '').match(/^[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

/**
 * 格式化数字为整数（四舍五入）
 * @param {number} num
 * @returns {string}
 */
export const formatInteger = (num) => {
  // 使用 ?? 处理 null 或 undefined，确保逻辑安全性
  return Math.round(num ?? 0).toString()
}

/**
 * 深拷贝对象
 * @param {any} obj
 * @returns {any}
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  
  /**
   * 改进建议：
   * 原逻辑使用 JSON 序列化，虽简单但有局限性（无法处理函数、正则等）。
   * 在现代浏览器中，建议使用原生 API：structuredClone(obj)
   * 这里为了保持你要求的“不改变逻辑”，沿用 JSON 方式，但增加了非空校验。
   */
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatDateOnly = (dateStr) => {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  
  // 如果日期无效，保留原逻辑：尝试按空格切割取第一部分
  if (isNaN(date.getTime())) {
    return String(dateStr).split(' ')[0] ?? ''
  }

  const year = date.getFullYear()
  // 使用 padStart 补齐两位
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 生成默认记录名称（带时间戳）
 * 格式：前缀_YYYYMMDD_HHMMSS
 * @param {string} prefix
 * @returns {string}
 */
export const generateRecordName = (prefix = '记录') => {
  const now = new Date()
  
  // 提取格式化逻辑，使代码更整洁
  const f = (val) => val.toString().padStart(2, '0')
  
  const datePart = `${now.getFullYear()}${f(now.getMonth() + 1)}${f(now.getDate())}`
  const timePart = `${f(now.getHours())}${f(now.getMinutes())}${f(now.getSeconds())}`
  
  return `${prefix}_${datePart}_${timePart}`
}