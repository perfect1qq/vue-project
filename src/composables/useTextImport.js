// src/composables/useTextImport.js
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export function useTextImport({
  parseRow,           // 解析单行数据的函数 (parts, mode) => item
  getColumnCount,     // 根据第一行列数返回模式名称的函数 (colCount) => mode
  onImportComplete    // 导入完成后的回调，接收 (mode, newItems)
}) {
  const importText = ref('')
  const replaceExisting = ref(false)

  const extractNumber = (str) => {
    const match = String(str).match(/^[\d.]+/)
    return match ? parseFloat(match[0]) : 0
  }

  const parseImportText = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (!lines.length) return { mode: null, data: [] }

    const firstLine = lines[0]
    const colCount = firstLine.split(/\t/).length
    const mode = getColumnCount(colCount)
    if (!mode) return { mode: null, data: [] }

    const data = []
    for (const line of lines) {
      const parts = line.split(/\t/)
      if (parts.length !== colCount) continue
      data.push(parseRow(parts, mode, extractNumber))
    }
    return { mode, data }
  }

  const parseAndImport = (currentItems, defaultEmptyRowChecker) => {
    const text = importText.value.trim()
    if (!text) {
      ElMessage.warning('请粘贴数据')
      return false
    }

    const { mode, data } = parseImportText(text)
    if (!mode || data.length === 0) {
      ElMessage.error('仅支持2列（数量、单价）或4列（名称、规格、数量、单价）的数据格式')
      return false
    }

    // 判断当前表格是否只有默认空行（需要替换）
    const isOnlyDefaultEmpty = defaultEmptyRowChecker && defaultEmptyRowChecker(currentItems)

    let finalItems
    if (replaceExisting.value || isOnlyDefaultEmpty) {
      finalItems = data
    } else {
      finalItems = [...currentItems, ...data]
    }

    onImportComplete(mode, finalItems)
    importText.value = ''
    replaceExisting.value = false
    return true
  }

  return {
    importText,
    replaceExisting,
    parseAndImport
  }
}