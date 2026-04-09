/**
 * 创建带清理能力的防抖函数。
 * 常用于搜索框输入，减少高频请求。
 * @param {Function} fn - 目标函数
 * @param {number} wait - 延迟毫秒数
 */
export function createDebounce(fn, wait = 300) {
  let timer = null

  const debounced = (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }

  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return debounced
}
