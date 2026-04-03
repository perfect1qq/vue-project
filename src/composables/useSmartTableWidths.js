import { computed } from 'vue'

const CJK_RE = /[一-鿿]/

const normalizeText = (value) => {
  if (value == null) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

const textWeight = (value) => {
  const text = normalizeText(value).trim()
  if (!text) return 0

  let weight = 0
  for (const ch of text) {
    if (CJK_RE.test(ch)) weight += 1.9
    else if (/\d/.test(ch)) weight += 0.95
    else if (/[A-Z]/.test(ch)) weight += 1.15
    else if (/[a-z]/.test(ch)) weight += 1.0
    else weight += 0.8
  }
  return weight
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

/**
 * 生成适合 Element Plus table 的百分比宽度映射。
 * columns: [{ key, label, getValue, minWeight, maxWeight, fixedShare }]
 */
export function useSmartTableWidths(columnsSource, rowsSource, options = {}) {
  const { minShare = 8, maxShare = 36 } = options

  return computed(() => {
    const columns = typeof columnsSource === 'function' ? columnsSource() : columnsSource
    const rows = typeof rowsSource === 'function' ? rowsSource() : rowsSource

    const visibleColumns = columns.filter(Boolean)
    if (!visibleColumns.length) return {}

    const weights = visibleColumns.map((column) => {
      if (column.fixedShare != null) return column.fixedShare

      const labelWeight = textWeight(column.label)
      const rowWeights = (rows || []).slice(0, 40).map((row) => {
        try {
          return textWeight(column.getValue ? column.getValue(row) : row?.[column.key])
        } catch {
          return 0
        }
      })
      const maxRowWeight = rowWeights.length ? Math.max(...rowWeights) : 0
      const base = column.minWeight ?? 6
      return clamp(Math.max(base, labelWeight, maxRowWeight), minShare, maxShare)
    })

    const total = weights.reduce((sum, item) => sum + item, 0) || 1
    const map = {}

    visibleColumns.forEach((column, index) => {
      const share = weights[index] / total * 100
      map[column.key] = `${share.toFixed(2)}%`
    })

    return map
  })
}
