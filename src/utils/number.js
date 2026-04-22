/**
 * @module utils/number
 * @description 数字处理工具
 *
 * 提供常用的数字处理函数：
 * - toNum: 安全转换为数字
 * - formatMoney: 金额格式化（千分位）
 * - fixed2: 保留两位小数
 * - rmbToUsdCeil: 人民币转美元
 */

export const toNum = (val) => {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

export const ceil = (num) => Math.ceil(num)

/**
 * 保留两位小数并返回 number，用于内部计算。
 */
export const fixed2 = (num) => Number(Number(num || 0).toFixed(2))

/**
 * 统一汇率分母，避免出现 0 导致除零。
 */
export const normalizeRate = (rate) => {
  const n = toNum(rate)
  return n > 0 ? n : 1
}

/**
 * 以人民币按汇率换算美元并向上取整。
 */
export const rmbToUsdCeil = (rmb, rate) => {
  const n = toNum(rmb)
  if (!n) return 0
  return ceil(n / normalizeRate(rate))
}

/**
 * 格式化金额（千分位 + 保留指定小数位）
 *
 * @param {number|string} value - 金额值
 * @param {number} [decimals=2] - 小数位数，默认2位
 * @param {string} [separator=','] - 千分位分隔符，默认逗号
 * @returns {string} 格式化后的金额字符串
 *
 * @example
 * formatMoney(12345.678) // '12,345.68'
 * formatMoney(1234567) // '1,234,567.00'
 * formatMoney(0) // '0.00'
 * formatMoney(null) // '0.00'
 * formatMoney(1234.5, 1) // '1,234.5'
 */
export const formatMoney = (value, decimals = 2, separator = ',') => {
  if (value === null || value === undefined || value === '') return '0.00'
  const num = Number(value)
  if (isNaN(num)) return '0.00'

  const fixedNum = num.toFixed(decimals)
  const [intPart, decPart] = fixedNum.split('.')

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator)

  return decimals > 0 ? `${formattedInt}.${decPart}` : formattedInt
}